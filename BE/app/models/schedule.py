"""
Schedule models for exam schedules and quiz data.
"""
import enum
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Enum, JSON,
    ForeignKey, func, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from app.database.db import Base


class ExamType(str, enum.Enum):
    midterm = "midterm"
    final = "final"
    quiz = "quiz"
    practical = "practical"


class ExamSchedule(Base):
    """Exam schedule for courses."""
    __tablename__ = "exam_schedules"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    exam_type = Column(Enum(ExamType), nullable=False)
    exam_date = Column(DateTime, nullable=False, index=True)
    duration_minutes = Column(Integer, nullable=False)  # Duration in minutes
    location = Column(String(200), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    course = relationship("Course", back_populates="exam_schedules")

    def __repr__(self):
        return f"<ExamSchedule(id={self.id}, course_id={self.course_id}, type={self.exam_type})>"


class GeneratedQuiz(Base):
    """Store generated quizzes for courses."""
    __tablename__ = "generated_quizzes"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    questions = Column(JSON, nullable=False)  # List of question objects
    source_chunks = Column(JSON, nullable=True)  # Chunk IDs used to generate quiz
    is_ai_generated = Column(Integer, nullable=False, default=1)  # 1=AI, 0=manual
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    course = relationship("Course", back_populates="generated_quizzes")
    user = relationship("User")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<GeneratedQuiz(id={self.id}, title={self.title})>"


class QuizAttempt(Base):
    """Track student quiz attempt results."""
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("generated_quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    answers = Column(JSON, nullable=False)        # {"0": "A", "1": "C", ...} — question index → chosen option
    score = Column(Integer, nullable=False)
    total_questions = Column(Integer, nullable=False)
    time_spent_seconds = Column(Integer, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    quiz = relationship("GeneratedQuiz", back_populates="attempts")
    user = relationship("User")

    def __repr__(self):
        return f"<QuizAttempt(id={self.id}, quiz_id={self.quiz_id}, user_id={self.user_id}, score={self.score})>"
