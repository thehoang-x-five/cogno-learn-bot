"""Aggregated stats for /api/me/dashboard-stats (teacher & student)."""
from typing import Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Float

from app.models.user import User, UserRole
from app.models.subject import Course, Enrollment, EnrollmentRole
from app.models.document import Document
from app.models.chat import Conversation, Message, MessageRole
from app.models.schedule import QuizAttempt, GeneratedQuiz


def _student_quiz_stats(db: Session, user_id: int) -> Tuple[int, Optional[float]]:
    cnt = (
        db.query(func.count(QuizAttempt.id))
        .filter(QuizAttempt.user_id == user_id)
        .scalar()
        or 0
    )
    avg = (
        db.query(
            func.avg(
                cast(QuizAttempt.score, Float) * 100.0 / cast(QuizAttempt.total_questions, Float)
            )
        )
        .filter(QuizAttempt.user_id == user_id, QuizAttempt.total_questions > 0)
        .scalar()
    )
    avg_val = round(float(avg), 1) if avg is not None else None
    return int(cnt), avg_val


def _teacher_quiz_stats(db: Session, course_ids: list) -> Tuple[int, Optional[float]]:
    if not course_ids:
        return 0, None
    cnt = (
        db.query(func.count(QuizAttempt.id))
        .join(GeneratedQuiz, QuizAttempt.quiz_id == GeneratedQuiz.id)
        .filter(GeneratedQuiz.course_id.in_(course_ids))
        .scalar()
        or 0
    )
    avg = (
        db.query(
            func.avg(
                cast(QuizAttempt.score, Float) * 100.0 / cast(QuizAttempt.total_questions, Float)
            )
        )
        .join(GeneratedQuiz, QuizAttempt.quiz_id == GeneratedQuiz.id)
        .filter(GeneratedQuiz.course_id.in_(course_ids), QuizAttempt.total_questions > 0)
        .scalar()
    )
    avg_val = round(float(avg), 1) if avg is not None else None
    return int(cnt), avg_val


def _global_quiz_stats(db: Session) -> Tuple[int, Optional[float]]:
    cnt = db.query(func.count(QuizAttempt.id)).scalar() or 0
    avg = (
        db.query(
            func.avg(
                cast(QuizAttempt.score, Float) * 100.0 / cast(QuizAttempt.total_questions, Float)
            )
        )
        .filter(QuizAttempt.total_questions > 0)
        .scalar()
    )
    avg_val = round(float(avg), 1) if avg is not None else None
    return int(cnt), avg_val


def get_my_dashboard_stats(db: Session, user: User) -> dict:
    conversations_count = (
        db.query(func.count(Conversation.id))
        .filter(Conversation.user_id == user.id)
        .scalar()
        or 0
    )

    user_messages_count = (
        db.query(func.count(Message.id))
        .join(Conversation, Message.conversation_id == Conversation.id)
        .filter(
            Conversation.user_id == user.id,
            Message.role == MessageRole.user,
        )
        .scalar()
        or 0
    )

    if user.role == UserRole.admin:
        courses_count = (
            db.query(func.count(Course.id)).filter(Course.is_active == True).scalar() or 0
        )
        q_cnt, q_avg = _global_quiz_stats(db)
        return {
            "courses_count": int(courses_count),
            "conversations_count": int(conversations_count),
            "user_messages_count": int(user_messages_count),
            "total_students": 0,
            "documents_total": 0,
            "quizzes_count": q_cnt,
            "quiz_avg_score": q_avg,
        }

    courses_count = (
        db.query(func.count(Enrollment.id))
        .filter(Enrollment.user_id == user.id)
        .scalar()
        or 0
    )

    total_students = 0
    documents_total = 0
    teacher_course_ids: list = []

    if user.role == UserRole.teacher:
        teacher_course_ids = [
            row[0]
            for row in db.query(Enrollment.course_id)
            .filter(
                Enrollment.user_id == user.id,
                Enrollment.role == EnrollmentRole.teacher,
            )
            .all()
        ]
        for cid in teacher_course_ids:
            total_students += (
                db.query(func.count(Enrollment.id))
                .filter(
                    Enrollment.course_id == cid,
                    Enrollment.role == EnrollmentRole.student,
                )
                .scalar()
                or 0
            )
            documents_total += (
                db.query(func.count(Document.id)).filter(Document.course_id == cid).scalar() or 0
            )

    if user.role == UserRole.teacher:
        q_cnt, q_avg = _teacher_quiz_stats(db, teacher_course_ids)
    elif user.role == UserRole.student:
        q_cnt, q_avg = _student_quiz_stats(db, user.id)
    else:
        q_cnt, q_avg = 0, None

    return {
        "courses_count": int(courses_count),
        "conversations_count": int(conversations_count),
        "user_messages_count": int(user_messages_count),
        "total_students": int(total_students),
        "documents_total": int(documents_total),
        "quizzes_count": q_cnt,
        "quiz_avg_score": q_avg,
    }
