import time
from datetime import datetime
from typing import Dict, Any, Optional

DEFAULT_STAGE_SLA_HOURS: Dict[str, int] = {
    "stage_1_lead_gen": 24,
    "stage_2_initial_contact": 48,
    "stage_3_site_visit_estimate": 72,
    "stage_4_closing": 48,
    "stage_5_completion_followup": 168,
}

def evaluate_lead_sla(
    stage: str,
    stage_entered_at: Optional[datetime],
    initial_contacted_at: Optional[datetime] = None,
    proposal_sent_at: Optional[datetime] = None,
    contract_signed_at: Optional[datetime] = None,
    hours_threshold: Optional[int] = None
) -> Dict[str, Any]:
    now_ts = time.time()
    entered_ts = stage_entered_at.timestamp() if stage_entered_at else now_ts
    hours_in_stage = max(0, round((now_ts - entered_ts) / 3600))

    threshold = hours_threshold or DEFAULT_STAGE_SLA_HOURS.get(stage, 48)
    deadline_ts = entered_ts + (threshold * 3600)
    hours_remaining = round((deadline_ts - now_ts) / 3600)

    # Stage 2: Initial Contact SLA
    if stage == "stage_2_initial_contact":
        if initial_contacted_at:
            return {
                "hoursInStage": hours_in_stage,
                "hoursRemaining": 0,
                "status": "met",
                "isStale": False,
                "badgeLabel": "Contacted within SLA",
                "badgeTone": "emerald",
            }
        if hours_remaining <= 0:
            overdue = abs(hours_remaining)
            return {
                "hoursInStage": hours_in_stage,
                "hoursRemaining": hours_remaining,
                "status": "breached",
                "isStale": True,
                "badgeLabel": f"Overdue: {overdue}h past 48h SLA",
                "badgeTone": "rose",
                "alertMessage": f"Breached 48h initial contact SLA ({overdue}h overdue)",
            }
        if hours_remaining <= 12:
            return {
                "hoursInStage": hours_in_stage,
                "hoursRemaining": hours_remaining,
                "status": "warning",
                "isStale": True,
                "badgeLabel": f"Action Due: {hours_remaining}h left",
                "badgeTone": "amber",
                "alertMessage": f"Approaching SLA deadline: only {hours_remaining}h remaining",
            }
        return {
            "hoursInStage": hours_in_stage,
            "hoursRemaining": hours_remaining,
            "status": "ok",
            "isStale": False,
            "badgeLabel": f"48h SLA: {hours_remaining}h left",
            "badgeTone": "sky",
        }

    # Stage 4: Closing / Proposal Follow-Up
    if stage in ("stage_4_closing", "stage_4_proposal_negotiation"):
        if contract_signed_at:
            return {
                "hoursInStage": hours_in_stage,
                "hoursRemaining": 0,
                "status": "met",
                "isStale": False,
                "badgeLabel": "Contract Executed",
                "badgeTone": "emerald",
            }
        if hours_remaining <= 0:
            overdue = abs(hours_remaining)
            return {
                "hoursInStage": hours_in_stage,
                "hoursRemaining": hours_remaining,
                "status": "breached",
                "isStale": True,
                "badgeLabel": f"Closing Stalled: {overdue}h past SLA",
                "badgeTone": "rose",
                "alertMessage": f"Follow-up required: proposal sent over 48h ago without signed contract",
            }

    # General Stage Fallback
    if hours_remaining <= 0:
        return {
            "hoursInStage": hours_in_stage,
            "hoursRemaining": hours_remaining,
            "status": "breached",
            "isStale": True,
            "badgeLabel": f"Exceeded {threshold}h SLA",
            "badgeTone": "rose",
            "alertMessage": f"Deal has remained in {stage} longer than target threshold",
        }

    return {
        "hoursInStage": hours_in_stage,
        "hoursRemaining": hours_remaining,
        "status": "ok",
        "isStale": False,
        "badgeLabel": f"On Track ({hours_in_stage}h in stage)",
        "badgeTone": "sky",
    }

def get_needs_follow_up_sql_condition(param_index: int = 1) -> str:
    return "(COALESCE(l.proposal_sent_at, l.last_contact_at, l.stage_entered_at, l.created_at) < (NOW() - (:threshold_hours || ' hours')::interval))"
