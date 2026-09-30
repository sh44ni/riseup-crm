from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.permissions import require_permission, has_permission
from app.services.sync import find_or_create_client, recalculate_client_stats
import orjson

class CreateInvoicePayload(BaseModel):
    jobId: int
    generateMilestones: Optional[bool] = None
    amount: Optional[float] = None
    dueDate: Optional[str] = None
    milestoneName: str = "Payment Milestone"
    notes: Optional[str] = None

class UpdateInvoicePayload(BaseModel):
    id: int
    status: Optional[str] = None
    paymentMethod: Optional[str] = None
    transactionId: Optional[str] = None
    notes: Optional[str] = None

class CreateExpensePayload(BaseModel):
    jobId: int
    category: str = Field(..., min_length=1)
    vendor: str = Field(..., min_length=1)
    amount: float = Field(..., ge=0)
    invoiceReceiptNumber: Optional[str] = None
    expenseDate: Optional[str] = None
    notes: Optional[str] = None

class ManageFinancingPayload(BaseModel):
    action: str = Field(..., min_length=1)
    id: Optional[int] = None
    name: Optional[str] = None
    apr: float = 0
    termMonths: int = 60
    minDownPaymentPct: float = 0
    isDefault: bool = False
    isActive: bool = True
    sortOrder: int = 0
    badgeLabel: Optional[str] = None
    description: Optional[str] = None
    minProjectCost: float = 5000
    maxProjectCost: float = 50000
    defaultProjectCost: float = 16500
    creditCheckCopyFlag: bool = True

router = APIRouter()

# ── FINANCES OVERVIEW ────────────────────────────────────────────────────────

@router.get("/finances")
async def get_finances_overview(
    user: Dict[str, Any] = Depends(require_permission("finances.view")),
    db: AsyncSession = Depends(get_db)
):
    can_view_profit = has_permission(user, "finances.view")
    can_create_invoice = has_permission(user, "finances.edit")

    inv_stats_query = text("""
        SELECT 
            COALESCE(SUM(amount), 0) as total_billed,
            COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as collected_cash,
            COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
            COALESCE(SUM(CASE WHEN status = 'overdue' OR (status = 'pending' AND due_date < CURRENT_DATE) THEN amount ELSE 0 END), 0) as overdue_amount,
            COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
            COUNT(CASE WHEN status = 'overdue' OR (status = 'pending' AND due_date < CURRENT_DATE) THEN 1 END) as overdue_count
        FROM invoices
    """)
    exp_stats_query = text("SELECT COALESCE(SUM(amount), 0) as total_expenses FROM job_expenses")
    contract_stats_query = text("SELECT COALESCE(SUM(contract_value), 0) as total_contract_value FROM jobs")
    recent_invoices_query = text("""
        SELECT i.*, j.job_number, j.customer_name, j.address, j.city 
        FROM invoices i
        LEFT JOIN jobs j ON i.job_id = j.id
        ORDER BY i.due_date ASC, i.created_at DESC LIMIT 15
    """)

    inv_res = await db.execute(inv_stats_query)
    inv = inv_res.first()

    exp_res = await db.execute(exp_stats_query)
    exp = exp_res.scalar() or 0.0

    cont_res = await db.execute(contract_stats_query)
    total_contract = float(cont_res.scalar() or 0.0)

    recent_res = await db.execute(recent_invoices_query)
    recent_invoices = [dict(r._mapping) for r in recent_res.fetchall()]

    total_expenses = float(exp)
    total_profit = max(0.0, total_contract - total_expenses)
    realized_margin_pct = round((total_profit / total_contract) * 100, 1) if total_contract > 0 else 35.0

    return {
        "summary": {
            "totalBilled": float(inv.total_billed if inv else 0),
            "collectedCash": float(inv.collected_cash if inv else 0),
            "pendingAmount": float(inv.pending_amount if inv else 0),
            "overdueAmount": float(inv.overdue_amount if inv else 0),
            "paidCount": int(inv.paid_count if inv else 0),
            "pendingCount": int(inv.pending_count if inv else 0),
            "overdueCount": int(inv.overdue_count if inv else 0),
            "totalExpenses": total_expenses if can_view_profit else None,
            "totalProfit": total_profit if can_view_profit else None,
            "realizedMarginPct": realized_margin_pct if can_view_profit else None,
        },
        "canCreateInvoice": can_create_invoice,
        "currentUser": {
            "id": user["id"],
            "name": user.get("name"),
            "role": user.get("role"),
        },
        "recentInvoices": recent_invoices,
    }

# ── INVOICES ─────────────────────────────────────────────────────────────────

@router.get("/invoices")
async def get_invoices(
    status: Optional[str] = None,
    job_id: Optional[int] = None,
    user: Dict[str, Any] = Depends(require_permission("finances.view")),
    db: AsyncSession = Depends(get_db)
):
    conditions = []
    params: Dict[str, Any] = {}

    if status and status != "all":
        if status == "overdue":
            conditions.append("(i.status = 'overdue' OR (i.status = 'pending' AND i.due_date < CURRENT_DATE))")
        else:
            params["status"] = status
            conditions.append("i.status = :status")

    if job_id:
        params["job_id"] = job_id
        conditions.append("i.job_id = :job_id")

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    stmt = text(f"""
        SELECT 
            i.*, 
            j.job_number, 
            j.customer_name, 
            j.customer_phone, 
            j.address, 
            j.city, 
            j.lead_id, 
            COALESCE(i.client_id, j.client_id) as client_id,
            c.source_type as client_source_type,
            c.lead_source_detail as client_source_detail,
            c.client_since,
            u_acq.name as acquired_by_name,
            u_acq.role as acquired_by_role,
            u_acq.avatar_url as acquired_by_avatar
        FROM invoices i
        LEFT JOIN jobs j ON i.job_id = j.id
        LEFT JOIN clients c ON COALESCE(i.client_id, j.client_id) = c.id
        LEFT JOIN users u_acq ON c.acquired_by_user_id = u_acq.id
        {where_clause}
        ORDER BY i.due_date ASC, i.created_at DESC
    """)
    res = await db.execute(stmt, params)
    rows = [dict(r._mapping) for r in res.fetchall()]
    return {"invoices": rows}

@router.post("/invoices")
async def create_invoice(
    payload: CreateInvoicePayload,
    user: Dict[str, Any] = Depends(require_permission("finances.edit")),
    db: AsyncSession = Depends(get_db)
):
    parsed_job_id = payload.jobId

    j_res = await db.execute(text("SELECT * FROM jobs WHERE id = :id"), {"id": parsed_job_id})
    job_row = j_res.first()
    if not job_row:
        raise HTTPException(status_code=404, detail="Selected job not found in pipeline")
    job = dict(job_row._mapping)

    resolved_client_id = int(job["client_id"]) if job.get("client_id") else None
    if not resolved_client_id:
        c = await find_or_create_client(
            db=db,
            full_name=job.get("customer_name") or "Homeowner",
            phone=job.get("customer_phone"),
            email=job.get("customer_email"),
            address=job.get("address"),
            city=job.get("city"),
            zip_code=job.get("zip"),
            lead_source="jobs_pipeline_invoicing",
        )
        resolved_client_id = c.id
        await db.execute(text("UPDATE jobs SET client_id = :cid WHERE id = :id"), {"cid": resolved_client_id, "id": parsed_job_id})

    year = datetime.now(timezone.utc).year

    # Mode A: CSLB-compliant 4-milestone schedule
    if payload.generateMilestones:
        contract_value = float(job.get("contract_value") or 12000)
        deposit_amount = min(1000.0, round(contract_value * 0.10, 2))
        delivery_amount = round(contract_value * 0.40, 2)
        dryin_amount = round(contract_value * 0.40, 2)
        final_amount = max(0.0, round(contract_value - (deposit_amount + delivery_amount + dryin_amount), 2))

        try:
            seq_val = (await db.execute(text("SELECT nextval('invoice_number_seq')"))).scalar()
        except Exception:
            await db.execute(text("CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1000"))
            seq_val = (await db.execute(text("SELECT nextval('invoice_number_seq')"))).scalar()

        today = datetime.now(timezone.utc)
        def add_days(d: int) -> str:
            return (today + timedelta(days=d)).strftime("%Y-%m-%d")

        milestones = [
            {"name": "Deposit (CSLB Compliant)", "amount": deposit_amount, "due": add_days(0)},
            {"name": "Material Delivery & Tear-off", "amount": delivery_amount, "due": add_days(7)},
            {"name": "Substantial Completion / Dry-In", "amount": dryin_amount, "due": add_days(14)},
            {"name": "Final City Inspection Passed", "amount": final_amount, "due": add_days(21)},
        ]

        created = []
        for i, m in enumerate(milestones):
            current_seq = seq_val + i
            inv_num = f"INV-{year}-{str(current_seq).zfill(4)}"
            ins_stmt = text("""
                INSERT INTO invoices (job_id, estimate_id, client_id, invoice_number, milestone_name, amount, due_date, status, notes)
                VALUES (:jid, :eid, :cid, :inum, :mname, :amt, :due, 'pending', :notes)
                RETURNING *
            """)
            r = await db.execute(ins_stmt, {
                "jid": job["id"],
                "eid": job.get("estimate_id"),
                "cid": resolved_client_id,
                "inum": inv_num,
                "mname": m["name"],
                "amt": m["amount"],
                "due": m["due"],
                "notes": f"Auto-generated CSLB § 7159 milestone for {job.get('job_number')} ({job.get('customer_name')})"
            })
            created.append(dict(r.first()._mapping))

        await db.execute(
            text("""
                INSERT INTO activities (
                    entity_type, entity_id, client_id, activity_type, title, description, performed_by, user_id, user_name
                ) VALUES (
                    'client', :cid, :cid, 'invoice_created', :title, :desc, :pby, :uid, :uname
                )
            """),
            {
                "cid": resolved_client_id,
                "title": "CSLB Milestone Billing Generated (4 Invoices)",
                "desc": f"{user.get('name')} generated CSLB-compliant 4-stage milestone invoices totaling ${contract_value:,.2f} for Job {job.get('job_number')}.",
                "pby": user.get("name") or "Staff",
                "uid": user["id"],
                "uname": user.get("name") or "Staff",
            }
        )

        if job.get("lead_id"):
            await db.execute(
                text("""
                    INSERT INTO activities (
                        entity_type, entity_id, client_id, activity_type, title, description, performed_by, user_id, user_name
                    ) VALUES (
                        'lead', :lid, :cid, 'invoice_created', :title, :desc, :pby, :uid, :uname
                    )
                """),
                {
                    "lid": job["lead_id"],
                    "cid": resolved_client_id,
                    "title": "CSLB Milestone Billing Generated",
                    "desc": f"4 milestone invoices created for Job {job.get('job_number')}.",
                    "pby": user.get("name") or "Staff",
                    "uid": user["id"],
                    "uname": user.get("name") or "Staff",
                }
            )

        await recalculate_client_stats(db, resolved_client_id)
        await db.commit()
        return {"ok": True, "invoices": created}

    # Mode B: Single custom milestone
    amount = payload.amount
    due_date = payload.dueDate
    if amount is None or amount <= 0 or not due_date:
        raise HTTPException(status_code=400, detail="Valid amount and due date are required")

    try:
        seq_val = (await db.execute(text("SELECT nextval('invoice_number_seq')"))).scalar()
    except Exception:
        await db.execute(text("CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1000"))
        seq_val = (await db.execute(text("SELECT nextval('invoice_number_seq')"))).scalar()

    invoice_number = f"INV-{year}-{str(seq_val).zfill(4)}"

    ins_stmt = text("""
        INSERT INTO invoices (
            job_id, estimate_id, client_id, invoice_number, milestone_name, amount, due_date, notes, status
        ) VALUES (:jid, :eid, :cid, :inum, :mname, :amt, :due, :notes, 'pending')
        RETURNING *
    """)
    res = await db.execute(ins_stmt, {
        "jid": job["id"],
        "eid": job.get("estimate_id"),
        "cid": resolved_client_id,
        "inum": invoice_number,
        "mname": payload.milestoneName,
        "amt": amount,
        "due": due_date,
        "notes": payload.notes,
    })
    new_invoice = dict(res.first()._mapping)

    await db.execute(
        text("""
            INSERT INTO activities (
                entity_type, entity_id, client_id, activity_type, title, description, performed_by, user_id, user_name
            ) VALUES (
                'client', :cid, :cid, 'invoice_created', :title, :desc, :pby, :uid, :uname
            )
        """),
        {
            "cid": resolved_client_id,
            "title": f"Invoice Issued: {invoice_number} (${float(amount):,.2f})",
            "desc": f"{user.get('name')} issued {new_invoice.get('milestone_name')} for Job {job.get('job_number')}.",
            "pby": user.get("name") or "Staff",
            "uid": user["id"],
            "uname": user.get("name") or "Staff",
        }
    )

    if job.get("lead_id"):
        await db.execute(
            text("""
                INSERT INTO activities (
                    entity_type, entity_id, client_id, activity_type, title, description, performed_by, user_id, user_name
                ) VALUES (
                    'lead', :lid, :cid, 'invoice_created', :title, :desc, :pby, :uid, :uname
                )
            """),
            {
                "lid": job["lead_id"],
                "cid": resolved_client_id,
                "title": f"Invoice Issued: {invoice_number}",
                "desc": f"{new_invoice.get('milestone_name')} (${float(amount):,.2f}) for Job {job.get('job_number')}",
                "pby": user.get("name") or "Staff",
                "uid": user["id"],
                "uname": user.get("name") or "Staff",
            }
        )

    await recalculate_client_stats(db, resolved_client_id)
    await db.commit()
    return {"ok": True, "invoice": new_invoice}

@router.patch("/invoices")
async def update_invoice(
    payload: UpdateInvoicePayload,
    user: Dict[str, Any] = Depends(require_permission("finances.edit")),
    db: AsyncSession = Depends(get_db)
):
    inv_id = payload.id

    updates = []
    params: Dict[str, Any] = {"id": inv_id}

    status = payload.status
    if status:
        params["status"] = status
        updates.append("status = :status")
        if status == "paid":
            updates.append("paid_at = NOW()")

    if payload.paymentMethod:
        params["paymentMethod"] = payload.paymentMethod
        updates.append("payment_method = :paymentMethod")

    if payload.transactionId:
        params["transactionId"] = payload.transactionId
        updates.append("transaction_id = :transactionId")

    if payload.notes:
        params["notes"] = payload.notes
        updates.append("notes = :notes")

    updates.append("updated_at = NOW()")

    stmt = text(f"UPDATE invoices SET {', '.join(updates)} WHERE id = :id RETURNING *")
    res = await db.execute(stmt, params)
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Invoice not found")
    inv = dict(row._mapping)

    if status == "paid":
        resolved_client_id = int(inv["client_id"]) if inv.get("client_id") else None
        j_res = await db.execute(text("SELECT lead_id, client_id, job_number FROM jobs WHERE id = :id"), {"id": inv["job_id"]})
        job = j_res.first()

        if job:
            if not resolved_client_id and job.client_id:
                resolved_client_id = int(job.client_id)
                await db.execute(text("UPDATE invoices SET client_id = :cid WHERE id = :id"), {"cid": resolved_client_id, "id": inv["id"]})

            # Log to Job timeline
            await db.execute(
                text("""
                    INSERT INTO activities (
                        entity_type, entity_id, client_id, activity_type, title, description, performed_by, user_id, user_name
                    ) VALUES (
                        'job', :jid, :cid, 'payment_received', :title, :desc, :pby, :uid, :uname
                    )
                """),
                {
                    "jid": inv["job_id"],
                    "cid": resolved_client_id,
                    "title": f"Payment Received: ${float(inv.get('amount') or 0):,.2f}",
                    "desc": f"Paid for {inv.get('milestone_name')} ({inv.get('invoice_number')}) via {payload.paymentMethod or 'Credit Card / Check'}",
                    "pby": user.get("name") or "Staff",
                    "uid": user["id"],
                    "uname": user.get("name") or "Staff",
                }
            )

            # Log to Client 360 timeline
            if resolved_client_id:
                await db.execute(
                    text("""
                        INSERT INTO activities (
                            entity_type, entity_id, client_id, activity_type, title, description, performed_by, user_id, user_name
                        ) VALUES (
                            'client', :cid, :cid, 'payment_received', :title, :desc, :pby, :uid, :uname
                        )
                    """),
                    {
                        "cid": resolved_client_id,
                        "title": f"Payment Received: ${float(inv.get('amount') or 0):,.2f}",
                        "desc": f"Milestone payment of ${float(inv.get('amount') or 0):,.2f} collected for Job {job.job_number or inv['job_id']} ({inv.get('milestone_name')})",
                        "pby": user.get("name") or "Staff",
                        "uid": user["id"],
                        "uname": user.get("name") or "Staff",
                    }
                )

            # Log to Lead timeline
            if job.lead_id:
                await db.execute(
                    text("""
                        INSERT INTO activities (
                            entity_type, entity_id, client_id, activity_type, title, description, performed_by, user_id, user_name
                        ) VALUES (
                            'lead', :lid, :cid, 'payment_received', :title, :desc, :pby, :uid, :uname
                        )
                    """),
                    {
                        "lid": job.lead_id,
                        "cid": resolved_client_id,
                        "title": f"Payment Received: ${float(inv.get('amount') or 0):,.2f}",
                        "desc": f"Paid for {inv.get('milestone_name')} ({inv.get('invoice_number')}) via {payload.paymentMethod or 'Credit Card / Check'}",
                        "pby": user.get("name") or "Staff",
                        "uid": user["id"],
                        "uname": user.get("name") or "Staff",
                    }
                )

        if resolved_client_id:
            await recalculate_client_stats(db, resolved_client_id)

    await db.commit()
    return {"ok": True, "invoice": inv}

# ── EXPENSES ─────────────────────────────────────────────────────────────────

@router.get("/expenses")
async def get_expenses(
    job_id: Optional[int] = None,
    user: Dict[str, Any] = Depends(require_permission("finances:view_expenses")),
    db: AsyncSession = Depends(get_db)
):
    sql = "SELECT * FROM job_expenses"
    params: Dict[str, Any] = {}
    if job_id:
        params["job_id"] = job_id
        sql += " WHERE job_id = :job_id"

    sql += " ORDER BY expense_date DESC, created_at DESC"
    res = await db.execute(text(sql), params)
    rows = [dict(r._mapping) for r in res.fetchall()]
    total = sum(float(r.get("amount") or 0) for r in rows)

    return {"expenses": rows, "total": total}

@router.post("/expenses")
async def create_expense(
    payload: CreateExpensePayload,
    user: Dict[str, Any] = Depends(require_permission("finances:manage_expenses")),
    db: AsyncSession = Depends(get_db)
):
    job_id = payload.jobId
    category = payload.category
    vendor = payload.vendor
    amount = payload.amount

    stmt = text("""
        INSERT INTO job_expenses (
            job_id, category, vendor, amount, invoice_receipt_number, expense_date, notes
        ) VALUES (:jid, :cat, :ven, :amt, :rec, :edate, :notes)
        RETURNING *
    """)
    res = await db.execute(stmt, {
        "jid": job_id,
        "cat": category,
        "ven": vendor,
        "amt": amount,
        "rec": payload.invoiceReceiptNumber,
        "edate": payload.expenseDate or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "notes": payload.notes,
    })
    await db.commit()
    return {"ok": True, "expense": dict(res.first()._mapping)}

@router.delete("/expenses")
async def delete_expense(
    id: int = Query(...),
    user: Dict[str, Any] = Depends(require_permission("finances:manage_expenses")),
    db: AsyncSession = Depends(get_db)
):
    await db.execute(text("DELETE FROM job_expenses WHERE id = :id"), {"id": id})
    await db.commit()
    return {"ok": True}

# ── FINANCING CONFIG ─────────────────────────────────────────────────────────

@router.get("/financing")
async def get_financing_admin(
    user: Dict[str, Any] = Depends(require_permission("settings:edit")),
    db: AsyncSession = Depends(get_db)
):
    plans_res = await db.execute(text("""
        SELECT id, name, apr, term_months, min_down_payment_pct, is_default, is_active, sort_order, badge_label, description, created_at, updated_at
        FROM financing_plans
        ORDER BY sort_order ASC
    """))
    plans = [dict(r._mapping) for r in plans_res.fetchall()]

    settings_res = await db.execute(text("""
        SELECT id, min_project_cost, max_project_cost, default_project_cost, credit_check_copy_flag, updated_at, updated_by
        FROM financing_settings
        WHERE id = 1
        LIMIT 1
    """))
    s_row = settings_res.first()

    calcs_res = await db.execute(text("""
        SELECT c.id, p.name as plan_name, c.project_cost, c.down_payment, c.monthly_payment, c.session_id, c.created_at
        FROM financing_calculations c
        LEFT JOIN financing_plans p ON c.plan_id = p.id
        ORDER BY c.created_at DESC
        LIMIT 100
    """))
    calcs = [dict(r._mapping) for r in calcs_res.fetchall()]

    s = dict(s_row._mapping) if s_row else {
        "min_project_cost": 5000,
        "max_project_cost": 50000,
        "default_project_cost": 16500,
        "credit_check_copy_flag": True,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": "system",
    }

    return {
        "ok": True,
        "plans": [
            {
                "id": p["id"],
                "name": p["name"],
                "apr": float(p["apr"]),
                "termMonths": p["term_months"],
                "minDownPaymentPct": float(p["min_down_payment_pct"]),
                "isDefault": p["is_default"],
                "isActive": p["is_active"],
                "sortOrder": p["sort_order"],
                "badgeLabel": p["badge_label"],
                "description": p["description"],
                "updatedAt": p["updated_at"],
            }
            for p in plans
        ],
        "settings": {
            "minProjectCost": float(s["min_project_cost"]),
            "maxProjectCost": float(s["max_project_cost"]),
            "defaultProjectCost": float(s["default_project_cost"]),
            "creditCheckCopyFlag": bool(s["credit_check_copy_flag"]),
            "updatedAt": s["updated_at"],
            "updatedBy": s["updated_by"],
        },
        "calculations": [
            {
                "id": c["id"],
                "planName": c["plan_name"] or "Custom Plan",
                "projectCost": float(c["project_cost"]),
                "downPayment": float(c["down_payment"]),
                "monthlyPayment": float(c["monthly_payment"]),
                "sessionId": c["session_id"],
                "createdAt": c["created_at"],
            }
            for c in calcs
        ]
    }

@router.post("/financing")
async def manage_financing(
    payload: ManageFinancingPayload,
    user: Dict[str, Any] = Depends(require_permission("settings:edit")),
    db: AsyncSession = Depends(get_db)
):
    action = payload.action

    if action == "save_plan":
        name = payload.name
        if not name or not name.strip():
            raise HTTPException(status_code=400, detail="Plan name is required")

        plan_id = payload.id
        apr = payload.apr
        term_months = payload.termMonths
        min_down = payload.minDownPaymentPct
        is_default = payload.isDefault
        is_active = payload.isActive
        sort_order = payload.sortOrder
        badge_label = payload.badgeLabel
        desc = payload.description

        if is_default:
            await db.execute(text("UPDATE financing_plans SET is_default = false"))

        if plan_id:
            await db.execute(
                text("""
                    UPDATE financing_plans
                    SET name = :name, apr = :apr, term_months = :term, min_down_payment_pct = :down,
                        is_default = :def, is_active = :act, sort_order = :sort, badge_label = :badge,
                        description = :desc, updated_at = NOW()
                    WHERE id = :id
                """),
                {
                    "name": name.strip(), "apr": apr, "term": term_months, "down": min_down,
                    "def": is_default, "act": is_active, "sort": sort_order, "badge": badge_label,
                    "desc": desc, "id": plan_id
                }
            )
        else:
            await db.execute(
                text("""
                    INSERT INTO financing_plans (
                        name, apr, term_months, min_down_payment_pct, is_default, is_active, sort_order, badge_label, description
                    ) VALUES (:name, :apr, :term, :down, :def, :act, :sort, :badge, :desc)
                """),
                {
                    "name": name.strip(), "apr": apr, "term": term_months, "down": min_down,
                    "def": is_default, "act": is_active, "sort": sort_order, "badge": badge_label, "desc": desc
                }
            )

        await db.commit()
        return {"ok": True, "message": "Financing plan saved successfully"}

    elif action == "set_default":
        plan_id = payload.id
        if not plan_id:
            raise HTTPException(status_code=400, detail="Plan ID is required")
        await db.execute(text("UPDATE financing_plans SET is_default = false"))
        await db.execute(text("UPDATE financing_plans SET is_default = true, is_active = true WHERE id = :id"), {"id": plan_id})
        await db.commit()
        return {"ok": True, "message": "Default plan updated"}

    elif action == "save_settings":
        min_cost = payload.minProjectCost
        max_cost = payload.maxProjectCost
        def_cost = payload.defaultProjectCost
        credit_flag = payload.creditCheckCopyFlag

        await db.execute(
            text("""
                UPDATE financing_settings
                SET min_project_cost = :min, max_project_cost = :max, default_project_cost = :def,
                    credit_check_copy_flag = :flag, updated_at = NOW(), updated_by = :by
                WHERE id = 1
            """),
            {
                "min": min_cost, "max": max_cost, "def": def_cost,
                "flag": credit_flag, "by": user.get("name") or "Staff"
            }
        )
        await db.commit()
        return {"ok": True, "message": "Calculator settings saved"}

    elif action == "delete_plan":
        plan_id = payload.id
        if not plan_id:
            raise HTTPException(status_code=400, detail="Plan ID is required")
        check = await db.execute(text("SELECT is_default FROM financing_plans WHERE id = :id"), {"id": plan_id})
        r = check.first()
        if r and r.is_default:
            raise HTTPException(status_code=400, detail="Cannot delete default financing plan")
        await db.execute(text("DELETE FROM financing_plans WHERE id = :id"), {"id": plan_id})
        await db.commit()
        return {"ok": True, "message": "Plan deleted"}

    raise HTTPException(status_code=400, detail="Unknown action")
