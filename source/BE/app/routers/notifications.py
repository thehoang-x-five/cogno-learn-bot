"""
Notifications Router — in-app notifications for users.
Prefix: /api/notifications
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.db import get_db
from app.dependencies.deps import get_current_user
from app.models.user import User
from app.models.notification import Notification

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


# ─── Helpers ─────────────────────────────────────────────

def _to_dict(n: Notification) -> dict:
    return {
        "id": n.id,
        "type": n.type,
        "title": n.title,
        "message": n.message,
        "is_read": n.is_read,
        "related_type": n.related_type,
        "related_id": n.related_id,
        "created_at": n.created_at.isoformat() if n.created_at else None,
    }


# ─── Endpoints ───────────────────────────────────────────

@router.get("/count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the number of unread notifications for the current user."""
    count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)
        .count()
    )
    return {"unread": count}


@router.get("/")
def list_notifications(
    unread: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List notifications for the current user, newest first."""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread is True:
        query = query.filter(Notification.is_read == False)
    total = query.count()
    items = query.order_by(desc(Notification.created_at)).offset(skip).limit(limit).all()
    return {"items": [_to_dict(n) for n in items], "total": total}


@router.patch("/{notif_id}/read", status_code=200)
def mark_read(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a single notification as read."""
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id,
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông báo")
    notif.is_read = True
    db.commit()
    return {"success": True}


@router.patch("/read-all", status_code=200)
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all notifications as read for the current user."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"success": True}


@router.delete("/{notif_id}", status_code=204)
def delete_notification(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a notification."""
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id,
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông báo")
    db.delete(notif)
    db.commit()
