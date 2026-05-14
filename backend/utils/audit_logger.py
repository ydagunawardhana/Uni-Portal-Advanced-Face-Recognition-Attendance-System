"""
utils/audit_logger.py
─────────────────────
Centralized audit logging utility.
Silently handles failures so logging never crashes API responses.
"""

from sqlalchemy.orm import Session
import models


def log_audit_action(
    db: Session,
    action_type: str,
    description: str,
    status: str = "Success",
    severity: str = "Info",
    target_id: str = None,
):
    """
    Write a single row into the `audit_logs` table.

    Parameters
    ----------
    db           : active SQLAlchemy session
    action_type  : category string that matches the frontend filter
                   ('Login Activity', 'Student Management',
                    'Lecturer Management', 'System Operations')
    description  : human-readable sentence describing what happened
    status       : 'Success' or 'Failed'
    severity     : 'Info', 'Warning', or 'Critical'
    target_id    : optional identifier of the affected record (e.g. student index)
    """
    try:
        full_description = description
        if target_id:
            full_description = f"{description} (Target: {target_id})"
        if status == "Failed":
            full_description = f"[FAILED] {full_description}"

        log = models.AuditLog(
            action_type=action_type,
            description=full_description,
        )
        db.add(log)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[AuditLogger] WARNING – could not write audit log: {e}")
