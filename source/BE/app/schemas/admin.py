from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from app.models.user import UserRole
from app.models.subject import EnrollmentRole


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: UserRole = UserRole.student


class UserCreate(BaseModel):
    """
    Create user schema for internal school system.
    Only email and role required - user will login via Google OAuth.
    """
    email: EmailStr
    role: UserRole = UserRole.student
    full_name: Optional[str] = None  # Optional, can be filled later from Google


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    is_active: bool = True
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Course Schemas
class CourseBase(BaseModel):
    code: str = Field(..., max_length=20)
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    semester: Optional[str] = Field(None, max_length=20)
    is_active: bool = True


class CourseCreate(CourseBase):
    pass


class CourseCreateWithEnrollments(CourseBase):
    """Create course with teachers and students at once"""
    teacher_ids: List[int] = Field(default_factory=list, description="List of teacher user IDs")
    student_ids: List[int] = Field(default_factory=list, description="List of student user IDs")


class CourseUpdate(BaseModel):
    code: Optional[str] = Field(None, max_length=20)
    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    semester: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None


class CourseResponse(CourseBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class EnrollmentInfo(BaseModel):
    """Enrollment info for a user in a course"""
    enrollment_id: int
    user_id: int
    role: EnrollmentRole

    class Config:
        from_attributes = True


class CourseWithEnrollmentsResponse(CourseResponse):
    """Course with enrollment details"""
    teacher_count: int = 0
    student_count: int = 0
    document_count: int = 0
    teachers: List[UserResponse] = []
    students: List[UserResponse] = []
    enrollments: List[EnrollmentInfo] = []  # For managing enrollments

    class Config:
        from_attributes = True


# Enrollment Schemas
class EnrollmentBase(BaseModel):
    user_id: int
    course_id: int
    role: EnrollmentRole = EnrollmentRole.student


class EnrollmentCreate(EnrollmentBase):
    pass


class EnrollmentUpdate(BaseModel):
    role: Optional[EnrollmentRole] = None


class EnrollmentResponse(EnrollmentBase):
    id: int
    enrolled_at: datetime
    user: Optional[UserResponse] = None
    course: Optional[CourseResponse] = None

    class Config:
        from_attributes = True


# Bulk Import Schemas
class ImportResult(BaseModel):
    success: int
    failed: int
    errors: List[str] = []
    message: str


# Statistics
class AdminStats(BaseModel):
    total_users: int
    total_students: int
    total_teachers: int
    total_admins: int
    total_courses: int
    total_enrollments: int
    documents_ready: int
    conversations_count: int
    messages_count: int
    new_users_this_month: int = 0
    new_users_last_month: int = 0


class AdminActivityDay(BaseModel):
    date: str  # YYYY-MM-DD (UTC)
    messages_count: int
    quizzes_count: int = 0


class AdminActivityResponse(BaseModel):
    days: List[AdminActivityDay]


class AdminTrafficHour(BaseModel):
    hour: str  # "HH:00"
    message_count: int


class AdminTrafficTodayResponse(BaseModel):
    hours: List[AdminTrafficHour]


class RecentUsersResponse(BaseModel):
    items: List[UserResponse]
