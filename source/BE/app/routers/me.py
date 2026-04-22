from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.dependencies.deps import get_current_user
from app.models.user import User
from app.schemas.dashboard import MyDashboardStats
from app.services.dashboard_stats_service import get_my_dashboard_stats

router = APIRouter(prefix="/api/me", tags=["Me"])


@router.get("/dashboard-stats", response_model=MyDashboardStats)
def read_my_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_my_dashboard_stats(db, current_user)
