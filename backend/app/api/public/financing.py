from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db

router = APIRouter(tags=["Financing"])

@router.get("/api/financing/config")
async def get_financing_config(db: AsyncSession = Depends(get_db)):
    plans_sql = text("""
        SELECT id, name, apr, term_months, min_down_payment_pct, is_default,
               is_active, sort_order, badge_label, description
        FROM financing_plans
        WHERE is_active = true
        ORDER BY sort_order ASC
    """)
    plans = (await db.execute(plans_sql)).mappings().all()

    settings_sql = text("""
        SELECT min_project_cost, max_project_cost, default_project_cost, credit_check_copy_flag
        FROM financing_settings
        WHERE id = 1
    """)
    sett = (await db.execute(settings_sql)).mappings().first()

    return {
        "ok": True,
        "plans": [dict(p) for p in plans],
        "settings": dict(sett) if sett else {
            "min_project_cost": 5000,
            "max_project_cost": 50000,
            "default_project_cost": 16500,
            "credit_check_copy_flag": True
        }
    }

@router.post("/api/financing/calculate")
async def calculate_financing(request: Request, db: AsyncSession = Depends(get_db)):
    body = await request.json()
    plan_id = body.get("planId")
    project_cost = float(body.get("projectCost") or 0)
    down_payment = float(body.get("downPayment") or 0)
    session_id = body.get("sessionId")

    if project_cost <= 0:
        raise HTTPException(status_code=400, detail="Valid project cost is required")

    plan_sql = text("SELECT id, name, apr, term_months FROM financing_plans WHERE id = :pid")
    plan = (await db.execute(plan_sql, {"pid": plan_id})).mappings().first()
    if not plan:
        raise HTTPException(status_code=404, detail="Financing plan not found")

    loan_amount = max(0.0, project_cost - down_payment)
    term_months = int(plan["term_months"])
    apr = float(plan["apr"])

    if apr == 0:
        monthly_payment = round(loan_amount / term_months) if term_months > 0 else 0
    else:
        monthly_rate = (apr / 100.0) / 12.0
        monthly_payment = round(loan_amount * (monthly_rate * (1 + monthly_rate) ** term_months) / (((1 + monthly_rate) ** term_months) - 1))

    # Log calculation
    insert_sql = text("""
        INSERT INTO financing_calculations (plan_id, project_cost, down_payment, monthly_payment, session_id, created_at)
        VALUES (:pid, :cost, :down, :monthly, :sess, NOW())
        RETURNING id
    """)
    calc_id = (await db.execute(insert_sql, {
        "pid": plan["id"],
        "cost": project_cost,
        "down": down_payment,
        "monthly": monthly_payment,
        "sess": session_id,
    })).scalar_one()

    return {
        "ok": True,
        "id": calc_id,
        "planName": plan["name"],
        "loanAmount": loan_amount,
        "termMonths": term_months,
        "apr": apr,
        "monthlyPayment": monthly_payment,
    }
