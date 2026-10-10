from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
import orjson
import os

from app.core.database import get_db
from app.core.permissions import require_permission, has_permission
from app.services.sync import find_or_create_client, recalculate_client_stats
from app.services.pdf_generator import generate_invoice_pdf, save_invoice_pdf_file, render_invoice_html
from app.services.email_service import send_invoice_email
from app.core.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()

class CreateClientInvoicePayload(BaseModel):
    clientId: Optional[int] = None
    jobId: Optional[int] = None
    estimateId: Optional[int] = None
    invoiceNumber: Optional[str] = None
    milestoneName: Optional[str] = "Roofing Scope & Services"
    amount: Optional[float] = None
    dueDate: Optional[str] = None
    paymentTerms: Optional[str] = "Due Upon Receipt"
    lineItems: Optional[List[Dict[str, Any]]] = None
    notes: Optional[str] = None
    status: Optional[str] = "pending"
    # Invoice v2: dynamic totals & payment options
    taxRate: Optional[float] = 0.0              # percent, applied to taxable items only
    discountType: Optional[str] = "flat"        # "flat" | "percent"
    discountValue: Optional[float] = 0.0
    depositAmount: Optional[float] = 0.0
    acceptedMethods: Optional[List[Any]] = None  # [{type, name?, fields:[{label,value}]}] (legacy: ["check", ...])
    paymentInstructions: Optional[str] = None


def compute_invoice_totals(
    line_items: List[Dict[str, Any]],
    tax_rate: float = 0.0,
    discount_type: str = "flat",
    discount_value: float = 0.0,
    deposit: float = 0.0,
) -> Dict[str, Any]:
    """
    Authoritative server-side invoice math (the client's numbers are never trusted).
    Discount-type rows are always negative credits; tax applies only to taxable
    non-discount rows (after the invoice-level discount is spread proportionally).
    """
    cleaned: List[Dict[str, Any]] = []
    gross = 0.0
    taxable_gross = 0.0
    line_credits = 0.0
    for raw in line_items or []:
        item = dict(raw)
        qty = float(item.get("quantity") or 1)
        rate = float(item.get("unit_price") or item.get("unitPrice") or 0)
        item_type = str(item.get("item_type") or "service").lower()
        row_total = round(qty * rate, 2)
        if item_type == "discount":
            row_total = -abs(row_total)
            line_credits += abs(row_total)
        else:
            gross += row_total
            if item.get("taxable"):
                taxable_gross += row_total
        item.update({
            "quantity": qty, "unit_price": rate, "total": row_total,
            "item_type": item_type, "taxable": bool(item.get("taxable")),
        })
        cleaned.append(item)

    base = max(0.0, gross - line_credits)
    dv = max(0.0, float(discount_value or 0))
    extra_discount = base * min(dv, 100.0) / 100.0 if discount_type == "percent" else min(dv, base)
    extra_discount = round(extra_discount, 2)
    discount_total = round(line_credits + extra_discount, 2)

    discount_ratio = (discount_total / gross) if gross > 0 else 0.0
    taxable_base = max(0.0, taxable_gross * (1 - discount_ratio))
    rate_pct = max(0.0, float(tax_rate or 0))
    tax_amount = round(taxable_base * rate_pct / 100.0, 2)

    total = round(max(0.0, gross - discount_total) + tax_amount, 2)
    deposit_amount = round(min(max(0.0, float(deposit or 0)), total), 2)
    return {
        "line_items": cleaned,
        "subtotal": round(gross, 2),
        "discount_amount": discount_total,
        "tax_rate": rate_pct,
        "tax_amount": tax_amount,
        "total": total,
        "deposit_amount": deposit_amount,
    }


ACCEPTED_METHOD_LABELS = {
    "other": "Other",
    "check": "Check",
    "ach_wire": "Bank Transfer / ACH",
    "credit_card": "Credit Card",
    "zelle": "Zelle",
    "cash": "Cash",
    "financing": "Financing",
    "insurance_check": "Insurance Check",
}


def normalize_payment_methods(raw: Any) -> List[Dict[str, Any]]:
    """
    Accepts the v2 shape [{type, name?, fields:[{label,value}]}] as well as legacy
    ["check", "zelle"] string lists, and returns a cleaned, size-limited list.
    """
    out: List[Dict[str, Any]] = []
    for entry in (raw or [])[:12]:
        if isinstance(entry, str):
            entry = {"type": entry, "fields": []}
        if not isinstance(entry, dict) or entry.get("type") not in ACCEPTED_METHOD_LABELS:
            continue
        fields = []
        for f in (entry.get("fields") or [])[:10]:
            if not isinstance(f, dict):
                continue
            label = str(f.get("label") or "").strip()[:60]
            value = str(f.get("value") or "").strip()[:300]
            if label and value:
                fields.append({"label": label, "value": value})
        item: Dict[str, Any] = {"type": entry["type"], "fields": fields}
        name = str(entry.get("name") or "").strip()[:60]
        if entry["type"] == "other" and name:
            item["name"] = name
        out.append(item)
    return out


def _pdf_extras(inv: Dict[str, Any]) -> Dict[str, Any]:
    """Extra v2 fields shared by the render and send endpoints."""
    methods = inv.get("accepted_methods") or []
    if isinstance(methods, str):
        try:
            methods = orjson.loads(methods)
        except Exception:
            methods = []
    pdf_methods = []
    for m in normalize_payment_methods(methods):
        label = m.get("name") or ACCEPTED_METHOD_LABELS.get(m["type"], m["type"].title())
        pdf_methods.append({
            "label": label,
            "lines": [f"{f['label']}: {f['value']}" if m["type"] != "other" or f["label"] != "Details" else f["value"] for f in m["fields"]],
        })
    return {
        "subtotal": float(inv.get("subtotal_amount") or 0) or None,
        "discount": float(inv.get("discount_amount") or 0),
        "tax_rate": float(inv.get("tax_rate") or 0),
        "tax_amount": float(inv.get("tax_amount") or 0),
        "deposit_amount": float(inv.get("deposit_amount") or 0),
        "accepted_methods": pdf_methods,
        "payment_instructions": inv.get("payment_instructions") or "",
    }


class RecordPaymentPayload(BaseModel):
    amount: float = Field(..., gt=0)
    paymentMethod: str = "check"
    transactionId: Optional[str] = None
    notes: Optional[str] = None
    paymentDate: Optional[str] = None

class SendInvoicePayload(BaseModel):
    customerEmail: Optional[str] = None
    customerName: Optional[str] = None
    customMessage: Optional[str] = None


@router.get("/clients/{client_id}/invoices")
async def list_client_invoices(
    client_id: int,
    user: Dict[str, Any] = Depends(require_permission("finances.view")),
    db: AsyncSession = Depends(get_db)
):
    """
    List all invoices for a client, complete with line items and payment records.
    """
    res = await db.execute(text("""
        SELECT i.*, j.job_number, j.status as job_status
        FROM invoices i
        LEFT JOIN jobs j ON i.job_id = j.id
        WHERE i.client_id = :id
           OR i.job_id IN (SELECT id FROM jobs WHERE client_id = :id)
           OR i.estimate_id IN (SELECT id FROM estimates WHERE client_id = :id)
        ORDER BY i.created_at DESC
    """), {"id": client_id})
    invoices = [dict(r._mapping) for r in res.fetchall()]

    if not invoices:
        return {"ok": True, "invoices": []}

    inv_ids = [inv["id"] for inv in invoices]
    p_res = await db.execute(text("""
        SELECT p.*, u.name as recorded_by_name
        FROM payments p
        LEFT JOIN users u ON p.recorded_by = u.id
        WHERE p.invoice_id = ANY(:ids)
        ORDER BY p.payment_date DESC, p.created_at DESC
    """), {"ids": inv_ids})
    all_payments = [dict(r._mapping) for r in p_res.fetchall()]

    payments_by_inv = {}
    for p in all_payments:
        iid = p["invoice_id"]
        payments_by_inv.setdefault(iid, []).append(p)

    for inv in invoices:
        inv["payments"] = payments_by_inv.get(inv["id"], [])
        if inv.get("line_items") and isinstance(inv["line_items"], str):
            try:
                inv["line_items"] = orjson.loads(inv["line_items"])
            except Exception:
                pass

    return {"ok": True, "invoices": invoices}


@router.post("/clients/{client_id}/invoices")
async def create_client_invoice(
    client_id: int,
    payload: CreateClientInvoicePayload,
    user: Dict[str, Any] = Depends(require_permission("finances.edit")),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new invoice directly attached to a Client 360 profile.
    Automatically assigns invoice number, calculates amounts, line items, and payment terms.
    """
    # Verify client exists
    c_res = await db.execute(text("SELECT * FROM clients WHERE id = :id"), {"id": client_id})
    client_row = c_res.first()
    if not client_row:
        raise HTTPException(status_code=404, detail="Client not found")
    client = dict(client_row._mapping)

    # Authoritative totals: line items, discount, tax and deposit are computed server-side
    line_items = payload.lineItems or []
    if not line_items and payload.amount and payload.amount > 0:
        line_items = [{
            "description": payload.milestoneName or "Roofing Services",
            "quantity": 1, "unit_price": float(payload.amount),
        }]
    totals = compute_invoice_totals(
        line_items,
        tax_rate=payload.taxRate or 0.0,
        discount_type=payload.discountType or "flat",
        discount_value=payload.discountValue or 0.0,
        deposit=payload.depositAmount or 0.0,
    )
    line_items = totals["line_items"]
    total_amount = totals["total"]
    if total_amount <= 0:
        raise HTTPException(status_code=400, detail="Invoice amount or valid line items must be greater than $0.00")
    accepted_methods = normalize_payment_methods(payload.acceptedMethods)

    # Due date resolution: default to today or 15 days if not specified
    due_date = payload.dueDate
    if not due_date:
        terms_lower = (payload.paymentTerms or "").lower()
        today = datetime.now(timezone.utc)
        if "30" in terms_lower:
            due_date = (today + timedelta(days=30)).strftime("%Y-%m-%d")
        elif "15" in terms_lower:
            due_date = (today + timedelta(days=15)).strftime("%Y-%m-%d")
        elif "7" in terms_lower:
            due_date = (today + timedelta(days=7)).strftime("%Y-%m-%d")
        else:
            due_date = today.strftime("%Y-%m-%d")

    # Sequential invoice number generation if not manually provided
    year = datetime.now(timezone.utc).year
    invoice_number = payload.invoiceNumber
    if not invoice_number:
        try:
            seq_val = (await db.execute(text("SELECT nextval('invoice_number_seq')"))).scalar()
        except Exception:
            await db.execute(text("CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1000"))
            seq_val = (await db.execute(text("SELECT nextval('invoice_number_seq')"))).scalar()
        invoice_number = f"INV-{year}-{str(seq_val).zfill(4)}"

    # Check uniqueness
    existing_num = await db.execute(text("SELECT id FROM invoices WHERE invoice_number = :inum"), {"inum": invoice_number})
    if existing_num.first():
        # append random digits if collision
        import secrets
        invoice_number = f"{invoice_number}-{secrets.token_hex(2).upper()}"

    initial_balance = total_amount

    # asyncpg requires a real date object for DATE/TIMESTAMP columns
    try:
        due_date = datetime.strptime(str(due_date)[:10], "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid due date format (expected YYYY-MM-DD)")

    ins_stmt = text("""
        INSERT INTO invoices (
            client_id, job_id, estimate_id, invoice_number, milestone_name,
            amount, balance, status, due_date, payment_terms, line_items, notes,
            subtotal_amount, discount_amount, tax_rate, tax_amount, deposit_amount,
            accepted_methods, payment_instructions
        ) VALUES (
            :cid, :jid, :eid, :inum, :mname,
            :amt, :bal, :status, :due, :terms, CAST(:lines AS jsonb), :notes,
            :sub, :disc, :trate, :tamt, :dep,
            CAST(:methods AS jsonb), :instr
        )
        RETURNING *
    """)
    res = await db.execute(ins_stmt, {
        "cid": client_id,
        "jid": payload.jobId,
        "eid": payload.estimateId,
        "inum": invoice_number,
        "mname": payload.milestoneName or "Roofing Services",
        "amt": total_amount,
        "bal": initial_balance,
        "status": payload.status or "pending",
        "due": due_date,
        "terms": payload.paymentTerms or "Due Upon Receipt",
        "lines": orjson.dumps(line_items).decode("utf-8"),
        "notes": payload.notes,
        "sub": totals["subtotal"],
        "disc": totals["discount_amount"],
        "trate": totals["tax_rate"],
        "tamt": totals["tax_amount"],
        "dep": totals["deposit_amount"],
        "methods": orjson.dumps(accepted_methods).decode("utf-8"),
        "instr": (payload.paymentInstructions or "").strip() or None,
    })
    new_inv = dict(res.first()._mapping)

    # Activity Log on client profile
    await db.execute(
        text("""
            INSERT INTO activities (
                entity_type, entity_id, client_id, activity_type, title, description, performed_by, user_id, user_name
            ) VALUES (
                'client', :cid, :cid, 'invoice_created', :title, :desc, :pby, :uid, :uname
            )
        """),
        {
            "cid": client_id,
            "title": f"Invoice Created: {invoice_number} (${total_amount:,.2f})",
            "desc": f"{user.get('name', 'Staff')} created invoice {invoice_number} ({payload.milestoneName or 'Services'}) for {client.get('full_name') or client.get('name')}.",
            "pby": user.get("name") or "Staff",
            "uid": user.get("id"),
            "uname": user.get("name") or "Staff",
        }
    )

    await recalculate_client_stats(db, client_id)
    await db.commit()

    return {"ok": True, "invoice": new_inv}


@router.get("/invoices/{invoice_id}")
async def get_invoice_detail(
    invoice_id: int,
    user: Dict[str, Any] = Depends(require_permission("finances.view")),
    db: AsyncSession = Depends(get_db)
):
    """
    Get invoice details along with client metadata and full payment transaction history.
    """
    res = await db.execute(text("""
        SELECT i.*, 
               c.full_name as client_name, c.email as client_email, c.phone as client_phone, 
               c.address as client_address, c.city as client_city, c.zip as client_zip,
               j.job_number, j.status as job_status
        FROM invoices i
        LEFT JOIN clients c ON i.client_id = c.id
        LEFT JOIN jobs j ON i.job_id = j.id
        WHERE i.id = :id
    """), {"id": invoice_id})
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Invoice not found")
    inv = dict(row._mapping)

    # Get payments for this invoice
    p_res = await db.execute(text("""
        SELECT p.*, u.name as recorded_by_name
        FROM payments p
        LEFT JOIN users u ON p.recorded_by = u.id
        WHERE p.invoice_id = :id
        ORDER BY p.payment_date DESC, p.created_at DESC
    """), {"id": invoice_id})
    payments = [dict(p._mapping) for p in p_res.fetchall()]
    inv["payments"] = payments

    # Parse line items if stored as string
    if inv.get("line_items") and isinstance(inv["line_items"], str):
        try:
            inv["line_items"] = orjson.loads(inv["line_items"])
        except Exception:
            pass

    return {"ok": True, "invoice": inv}


@router.get("/invoices/{invoice_id}/render-pdf")
async def render_invoice_pdf_endpoint(
    invoice_id: int,
    user: Dict[str, Any] = Depends(require_permission("finances.view")),
    db: AsyncSession = Depends(get_db)
):
    """
    Renders high-fidelity Letter PDF with official vector logo and saves to static uploads.
    """
    res = await db.execute(text("""
        SELECT i.*, 
               c.full_name as client_name, c.email as client_email, c.phone as client_phone, 
               c.address as client_address, c.city as client_city, c.zip as client_zip,
               j.job_number
        FROM invoices i
        LEFT JOIN clients c ON i.client_id = c.id
        LEFT JOIN jobs j ON i.job_id = j.id
        WHERE i.id = :id
    """), {"id": invoice_id})
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Invoice not found")
    inv = dict(row._mapping)

    # Get total paid
    p_res = await db.execute(text("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = :id AND status = 'completed'"), {"id": invoice_id})
    paid_sum = float(p_res.scalar() or 0.0)

    # Parse line items
    raw_lines = inv.get("line_items") or []
    if isinstance(raw_lines, str):
        try:
            raw_lines = orjson.loads(raw_lines)
        except Exception:
            raw_lines = []

    cleaned_lines = []
    for item in raw_lines:
        if isinstance(item, dict):
            try:
                q = float(item.get("quantity") or 1)
                p = float(item.get("unit_price") or item.get("unitPrice") or 0)
                tot = float(item.get("total") or (q * p))
                cleaned_lines.append({
                    "description": str(item.get("description") or "Roofing Services"),
                    "quantity": q,
                    "unit_price": p,
                    "total": tot,
                    "notes": item.get("notes") or "",
                    "unit": item.get("unit") or "",
                })
            except Exception:
                cleaned_lines.append(item)
        else:
            cleaned_lines.append(item)

    addr_parts = [inv.get("client_address"), inv.get("client_city"), inv.get("client_zip")]
    property_addr = ", ".join([str(p).strip() for p in addr_parts if p and str(p).strip()])

    client_dict = {
        "name": inv.get("client_name") or "Valued Client",
        "email": inv.get("client_email") or "",
        "phone": inv.get("client_phone") or "",
        "property": property_addr,
    }

    inv_amount = float(inv.get("amount") or 0.0)
    current_bal = float(inv.get("balance")) if inv.get("balance") is not None else max(0.0, inv_amount - paid_sum)

    created_dt = inv.get("created_at")
    if hasattr(created_dt, "strftime"):
        date_str = created_dt.strftime("%B %d, %Y")
    elif created_dt:
        date_str = str(created_dt).split("T")[0]
    else:
        date_str = datetime.now(timezone.utc).strftime("%B %d, %Y")

    due_dt = inv.get("due_date")
    if hasattr(due_dt, "strftime"):
        due_str = due_dt.strftime("%B %d, %Y")
    elif due_dt:
        due_str = str(due_dt).split("T")[0]
    else:
        due_str = "Due Upon Receipt"

    invoice_data = {
        "invoice_number": inv.get("invoice_number"),
        "date": date_str,
        "due_date": due_str,
        "payment_terms": inv.get("payment_terms") or "Due Upon Receipt",
        "milestone_name": inv.get("milestone_name") or "Roofing Services",
        "job_number": inv.get("job_number"),
        "amount": inv_amount,
        "paid_amount": paid_sum,
        "balance": current_bal,
        "status": inv.get("status") or "pending",
        "line_items": cleaned_lines,
        "notes": inv.get("notes") or "",
        **_pdf_extras(inv),
    }

    try:
        pdf_bytes = await generate_invoice_pdf(invoice_data, client_dict)
        saved_url = save_invoice_pdf_file(inv["invoice_number"], pdf_bytes)
    except Exception as e:
        logger.exception("Failed to render invoice PDF (id=%s): %s", invoice_id, e)
        raise HTTPException(status_code=500, detail=f"Invoice PDF generation failed: {str(e)}")

    await db.execute(text("UPDATE invoices SET pdf_url = :url, updated_at = NOW() WHERE id = :id"), {"url": saved_url, "id": invoice_id})
    await db.commit()

    return {"ok": True, "pdfUrl": saved_url, "url": saved_url, "filename": f"Invoice_{inv['invoice_number']}.pdf"}


@router.post("/invoices/{invoice_id}/send")
async def send_invoice_email_endpoint(
    invoice_id: int,
    payload: Optional[SendInvoicePayload] = None,
    user: Dict[str, Any] = Depends(require_permission("finances.edit")),
    db: AsyncSession = Depends(get_db)
):
    """
    Generates PDF and sends the official invoice via email with attachment.
    """
    res = await db.execute(text("""
        SELECT i.*, 
               c.full_name as client_name, c.email as client_email, c.phone as client_phone, 
               c.address as client_address, c.city as client_city, c.zip as client_zip,
               j.job_number
        FROM invoices i
        LEFT JOIN clients c ON i.client_id = c.id
        LEFT JOIN jobs j ON i.job_id = j.id
        WHERE i.id = :id
    """), {"id": invoice_id})
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Invoice not found")
    inv = dict(row._mapping)

    recipient = (payload.customerEmail if payload and payload.customerEmail else None) or inv.get("client_email")
    if not recipient:
        raise HTTPException(status_code=400, detail="No client email on file. Please enter an email address to send the invoice.")

    # Calculate balance & line items
    p_res = await db.execute(text("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = :id AND status = 'completed'"), {"id": invoice_id})
    paid_sum = float(p_res.scalar() or 0.0)

    raw_lines = inv.get("line_items") or []
    if isinstance(raw_lines, str):
        try:
            raw_lines = orjson.loads(raw_lines)
        except Exception:
            raw_lines = []

    cleaned_lines = []
    for item in raw_lines:
        if isinstance(item, dict):
            try:
                q = float(item.get("quantity") or 1)
                p = float(item.get("unit_price") or item.get("unitPrice") or 0)
                tot = float(item.get("total") or (q * p))
                cleaned_lines.append({
                    "description": str(item.get("description") or "Roofing Services"),
                    "quantity": q,
                    "unit_price": p,
                    "total": tot,
                    "notes": item.get("notes") or "",
                    "unit": item.get("unit") or "",
                })
            except Exception:
                cleaned_lines.append(item)
        else:
            cleaned_lines.append(item)

    addr_parts = [inv.get("client_address"), inv.get("client_city"), inv.get("client_zip")]
    property_addr = ", ".join([str(p).strip() for p in addr_parts if p and str(p).strip()])

    client_dict = {
        "name": (payload.customerName if payload and payload.customerName else None) or inv.get("client_name") or "Valued Client",
        "email": recipient,
        "phone": inv.get("client_phone") or "",
        "property": property_addr,
    }

    inv_amount = float(inv.get("amount") or 0.0)
    current_bal = float(inv.get("balance")) if inv.get("balance") is not None else max(0.0, inv_amount - paid_sum)

    created_dt = inv.get("created_at")
    if hasattr(created_dt, "strftime"):
        date_str = created_dt.strftime("%B %d, %Y")
    elif created_dt:
        date_str = str(created_dt).split("T")[0]
    else:
        date_str = datetime.now(timezone.utc).strftime("%B %d, %Y")

    due_dt = inv.get("due_date")
    if hasattr(due_dt, "strftime"):
        due_str = due_dt.strftime("%B %d, %Y")
    elif due_dt:
        due_str = str(due_dt).split("T")[0]
    else:
        due_str = "Due Upon Receipt"

    invoice_data = {
        "invoice_number": inv.get("invoice_number"),
        "date": date_str,
        "due_date": due_str,
        "payment_terms": inv.get("payment_terms") or "Due Upon Receipt",
        "milestone_name": inv.get("milestone_name") or "Roofing Services",
        "job_number": inv.get("job_number"),
        "amount": inv_amount,
        "paid_amount": paid_sum,
        "balance": current_bal,
        "status": inv.get("status") or "pending",
        "line_items": cleaned_lines,
        "notes": inv.get("notes") or "",
        **_pdf_extras(inv),
    }

    # Generate fresh PDF
    try:
        pdf_bytes = await generate_invoice_pdf(invoice_data, client_dict)
        saved_url = save_invoice_pdf_file(inv["invoice_number"], pdf_bytes)
    except Exception as e:
        logger.exception("Failed to generate invoice PDF for email (id=%s): %s", invoice_id, e)
        raise HTTPException(status_code=500, detail=f"Invoice PDF generation failed: {str(e)}")

    # Send Email
    email_res = await send_invoice_email(
        to_email=recipient,
        customer_name=client_dict["name"],
        invoice_number=inv["invoice_number"],
        amount_due=current_bal,
        due_date=str(invoice_data["due_date"]),
        pdf_bytes=pdf_bytes,
        custom_message=payload.customMessage if payload else None,
    )

    new_status = "pending" if inv.get("status") not in ("paid", "partially_paid", "overdue") else inv.get("status")

    await db.execute(text("""
        UPDATE invoices 
        SET status = :st, sent_at = NOW(), sent_to_email = :email, pdf_url = :purl, updated_at = NOW() 
        WHERE id = :id
    """), {"st": new_status, "email": recipient, "purl": saved_url, "id": invoice_id})

    # Activity log
    if inv.get("client_id"):
        await db.execute(
            text("""
                INSERT INTO activities (
                    entity_type, entity_id, client_id, activity_type, title, description, performed_by, user_id, user_name
                ) VALUES (
                    'client', :cid, :cid, 'invoice_sent', :title, :desc, :pby, :uid, :uname
                )
            """),
            {
                "cid": inv["client_id"],
                "title": f"Invoice Sent: {inv['invoice_number']}",
                "desc": f"Invoice {inv['invoice_number']} sent via email to {recipient}.",
                "pby": user.get("name") or "Staff",
                "uid": user.get("id"),
                "uname": user.get("name") or "Staff",
            }
        )

    await db.commit()

    return {
        "ok": True,
        "message": f"Invoice {inv['invoice_number']} emailed to {recipient}",
        "emailResult": email_res,
        "pdfUrl": saved_url
    }


@router.post("/invoices/{invoice_id}/payments")
async def record_invoice_payment(
    invoice_id: int,
    payload: RecordPaymentPayload,
    user: Dict[str, Any] = Depends(require_permission("finances.edit")),
    db: AsyncSession = Depends(get_db)
):
    """
    Record a payment against an invoice, automatically updating remaining balance and status.
    """
    res = await db.execute(text("SELECT * FROM invoices WHERE id = :id"), {"id": invoice_id})
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Invoice not found")
    inv = dict(row._mapping)

    payment_amount = float(payload.amount)
    if payment_amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than $0")

    try:
        pay_dt = (
            datetime.strptime(payload.paymentDate[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
            if payload.paymentDate else datetime.now(timezone.utc)
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payment date format (expected YYYY-MM-DD)")

    # Insert payment record
    p_ins = text("""
        INSERT INTO payments (
            invoice_id, amount, payment_method, transaction_id, status, recorded_by, payment_date, notes
        ) VALUES (
            :iid, :amt, :method, :txid, 'completed', :recby, :pdate, :notes
        )
        RETURNING *
    """)
    p_res = await db.execute(p_ins, {
        "iid": invoice_id,
        "amt": payment_amount,
        "method": payload.paymentMethod,
        "txid": payload.transactionId,
        "recby": user.get("id"),
        "pdate": pay_dt,
        "notes": payload.notes,
    })
    payment_row = dict(p_res.first()._mapping)

    # Calculate new total paid for this invoice
    sum_res = await db.execute(text("SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = :id AND status = 'completed'"), {"id": invoice_id})
    total_paid_now = float(sum_res.scalar() or 0.0)
    inv_total = float(inv.get("amount") or 0.0)
    new_balance = max(0.0, round(inv_total - total_paid_now, 2))

    new_status = "paid" if new_balance <= 0.001 else "partially_paid"
    paid_at_clause = ", paid_at = NOW()" if new_balance <= 0.001 else ""

    await db.execute(text(f"""
        UPDATE invoices 
        SET balance = :bal, status = :st {paid_at_clause}, updated_at = NOW()
        WHERE id = :id
    """), {"bal": new_balance, "st": new_status, "id": invoice_id})

    # Log client activity
    if inv.get("client_id"):
        await db.execute(
            text("""
                INSERT INTO activities (
                    entity_type, entity_id, client_id, activity_type, title, description, performed_by, user_id, user_name
                ) VALUES (
                    'client', :cid, :cid, 'payment_recorded', :title, :desc, :pby, :uid, :uname
                )
            """),
            {
                "cid": inv["client_id"],
                "title": f"Payment Received: ${payment_amount:,.2f} ({payload.paymentMethod.upper()})",
                "desc": f"Payment of ${payment_amount:,.2f} applied to invoice {inv['invoice_number']}. Remaining balance: ${new_balance:,.2f}.",
                "pby": user.get("name") or "Staff",
                "uid": user.get("id"),
                "uname": user.get("name") or "Staff",
            }
        )
        await recalculate_client_stats(db, inv["client_id"])

    await db.commit()

    # Fetch updated invoice
    updated_inv_res = await db.execute(text("SELECT * FROM invoices WHERE id = :id"), {"id": invoice_id})
    updated_inv = dict(updated_inv_res.first()._mapping)

    return {
        "ok": True,
        "message": f"Payment of ${payment_amount:,.2f} applied to {inv['invoice_number']}",
        "invoice": updated_inv,
        "payment": payment_row,
    }


@router.delete("/invoices/{invoice_id}")
async def delete_invoice(
    invoice_id: int,
    user: Dict[str, Any] = Depends(require_permission("finances.edit")),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete or void an invoice.
    """
    res = await db.execute(text("SELECT * FROM invoices WHERE id = :id"), {"id": invoice_id})
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Invoice not found")
    inv = dict(row._mapping)

    await db.execute(text("DELETE FROM invoices WHERE id = :id"), {"id": invoice_id})
    if inv.get("client_id"):
        await recalculate_client_stats(db, inv["client_id"])
    await db.commit()

    return {"ok": True, "message": f"Invoice {inv['invoice_number']} deleted"}
