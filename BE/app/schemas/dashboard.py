from pydantic import BaseModel
from typing import Optional


class MyDashboardStats(BaseModel):
    courses_count: int
    conversations_count: int
    user_messages_count: int
    total_students: int = 0
    documents_total: int = 0
    quizzes_count: int = 0
    quiz_avg_score: Optional[float] = None
