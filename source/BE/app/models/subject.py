import enum
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, Enum,
    ForeignKey, func, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from app.database.db import Base

# Import schedule models to ensure they're loaded before relationships are configured
from app.models import schedule  # noqa: F401


class EnrollmentRole(str, enum.Enum):
    teacher = "teacher"
    student = "student"


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    semester = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    enrollments = relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="course", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="course", cascade="all, delete-orphan")
    exam_schedules = relationship("ExamSchedule", back_populates="course", cascade="all, delete-orphan")
    generated_quizzes = relationship("GeneratedQuiz", back_populates="course", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Course(id={self.id}, code={self.code}, name={self.name})>"


class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (
        UniqueConstraint("user_id", "course_id", name="uq_user_course"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(Enum(EnrollmentRole), nullable=False, default=EnrollmentRole.student)
    enrolled_at = Column(DateTime, server_default=func.now())

    # Relationships
    user = relationship("User")
    course = relationship("Course", back_populates="enrollments")

    def __repr__(self):
        return f"<Enrollment(user_id={self.user_id}, course_id={self.course_id}, role={self.role})>"
