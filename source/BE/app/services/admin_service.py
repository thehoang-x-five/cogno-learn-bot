from sqlalchemy.orm import Session
from sqlalchemy import func, or_, extract
from typing import List, Optional, Tuple
from datetime import datetime, timedelta
from fastapi import UploadFile, HTTPException
import pandas as pd
import io

from app.models.user import User, UserRole
from app.models.subject import Course, Enrollment, EnrollmentRole
from app.models.document import Document, DocumentStatus
from app.models.chat import Conversation, Message
from app.schemas.admin import (
    UserCreate, UserUpdate, CourseCreate, CourseUpdate,
    EnrollmentCreate, ImportResult
)

import logging as _logging
_svc_logger = _logging.getLogger(__name__)


# ─── Notification helpers ─────────────────────────────────────────────────────

def _queue_student_enrollment_notifications(course: "Course", user_ids: list) -> None:
    """Async-notify each student that they were added to a course."""
    # #region agent log
    import json as _j2, time as _t2
    def _hlog(msg, data, hyp):
        try:
            with open("/app/debug-1b57e8.log", "a") as _f:
                _f.write(_j2.dumps({"sessionId":"1b57e8","timestamp":int(_t2.time()*1000),"location":"admin_service.py:_queue_student","message":msg,"data":data,"hypothesisId":hyp}) + "\n")
        except Exception: pass
    _hlog("helper_called", {"course_id": course.id if course else None, "user_ids": user_ids}, "H1")
    # #endregion
    if not user_ids:
        return
    try:
        from app.celery_app import celery_app
        celery_app.send_task(
            'create_notifications',
            kwargs=dict(
                user_ids=list(user_ids),
                type="enrollment",
                title="Bạn đã được thêm vào môn học",
                message=f"Bạn vừa được thêm vào môn {course.name}",
                related_type="course",
                related_id=course.id,
            ),
        )
        # #region agent log
        _hlog("send_task_sent", {"user_ids": user_ids, "course_id": course.id}, "H1")
        # #endregion
    except Exception as _e:
        _svc_logger.warning(f"[notif] student enrollment notification failed: {_e}")
        # #region agent log
        _hlog("send_task_error", {"error": str(_e)}, "H1")
        # #endregion


def _queue_teacher_assignment_notifications(course: "Course", user_ids: list) -> None:
    """Async-notify each teacher that they were assigned to a course by an admin."""
    if not user_ids:
        return
    try:
        from app.celery_app import celery_app
        celery_app.send_task(
            'create_notifications',
            kwargs=dict(
                user_ids=list(user_ids),
                type="course_staff",
                title="Bạn được thêm làm giảng viên môn học",
                message=f"Bạn vừa được gán vào môn {course.name} với vai trò giảng viên",
                related_type="course",
                related_id=course.id,
            ),
        )
    except Exception as _e:
        _svc_logger.warning(f"[notif] teacher assignment notification failed: {_e}")


# ─────────────────────────────────────────────────────────────────────────────

# ============ User Management ============
def get_users(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    role: Optional[UserRole] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = None
) -> Tuple[List[User], int]:
    """Get users with filters and pagination"""
    query = db.query(User)
    
    if role:
        query = query.filter(User.role == role)
    
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                User.email.ilike(search_pattern),
                User.full_name.ilike(search_pattern)
            )
        )
    
    total = query.count()
    users = query.offset(skip).limit(limit).all()
    
    return users, total


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Get user by ID"""
    return db.query(User).filter(User.id == user_id).first()


def create_user(db: Session, user_data: UserCreate) -> User:
    """
    Create new user (admin only).
    For internal school system: Only email and role required.
    User will login via Google OAuth later.
    """
    # Check if email exists
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email đã tồn tại trong hệ thống")
    
    # Create user with email and role only
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,  # Optional
        role=user_data.role,
        is_active=True,  # Active by default
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user(db: Session, user_id: int, user_data: UserUpdate) -> Optional[User]:
    """Update user"""
    user = get_user_by_id(db, user_id)
    if not user:
        return None
    
    # Check email uniqueness if updating email
    if user_data.email and user_data.email != user.email:
        existing = db.query(User).filter(User.email == user_data.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email đã tồn tại")
    
    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: int) -> bool:
    """Soft delete user by setting is_active to False"""
    user = get_user_by_id(db, user_id)
    if not user:
        return False
    
    user.is_active = False
    db.commit()
    return True


# ============ Course Management ============
def get_courses(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    semester: Optional[str] = None
) -> Tuple[List[Course], int]:
    """Get courses with filters and pagination"""
    query = db.query(Course)
    
    if is_active is not None:
        query = query.filter(Course.is_active == is_active)
    
    if semester:
        query = query.filter(Course.semester == semester)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Course.code.ilike(search_pattern),
                Course.name.ilike(search_pattern)
            )
        )
    
    total = query.count()
    courses = query.offset(skip).limit(limit).all()
    
    return courses, total


def get_course_by_id(db: Session, course_id: int) -> Optional[Course]:
    """Get course by ID"""
    return db.query(Course).filter(Course.id == course_id).first()


def create_course(db: Session, course_data: CourseCreate) -> Course:
    """Create new course"""
    # Check if code exists
    existing = db.query(Course).filter(Course.code == course_data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Mã môn học đã tồn tại")
    
    course = Course(**course_data.model_dump())
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


def update_course(db: Session, course_id: int, course_data: CourseUpdate) -> Optional[Course]:
    """Update course"""
    course = get_course_by_id(db, course_id)
    if not course:
        return None
    
    # Check code uniqueness if updating code
    if course_data.code and course_data.code != course.code:
        existing = db.query(Course).filter(Course.code == course_data.code).first()
        if existing:
            raise HTTPException(status_code=400, detail="Mã môn học đã tồn tại")
    
    update_data = course_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(course, field, value)
    
    db.commit()
    db.refresh(course)
    return course


def delete_course(db: Session, course_id: int) -> bool:
    """Delete course"""
    course = get_course_by_id(db, course_id)
    if not course:
        return False
    
    db.delete(course)
    db.commit()
    return True


# ============ Enrollment Management ============
def get_enrollments(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    user_id: Optional[int] = None,
    course_id: Optional[int] = None,
    role: Optional[EnrollmentRole] = None
) -> Tuple[List[Enrollment], int]:
    """Get enrollments with filters"""
    query = db.query(Enrollment)
    
    if user_id:
        query = query.filter(Enrollment.user_id == user_id)
    
    if course_id:
        query = query.filter(Enrollment.course_id == course_id)
    
    if role:
        query = query.filter(Enrollment.role == role)
    
    total = query.count()
    enrollments = query.offset(skip).limit(limit).all()
    
    return enrollments, total


def create_enrollment(db: Session, enrollment_data: EnrollmentCreate) -> Enrollment:
    """Create new enrollment"""
    # Check if user exists and is active
    user = db.query(User).filter(User.id == enrollment_data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Không thể thêm người dùng đã bị vô hiệu hóa vào khóa học")
    
    # Check if course exists
    course = db.query(Course).filter(Course.id == enrollment_data.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Không tìm thấy môn học")
    
    # Check if enrollment already exists
    existing = db.query(Enrollment).filter(
        Enrollment.user_id == enrollment_data.user_id,
        Enrollment.course_id == enrollment_data.course_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Đã đăng ký môn học này")
    
    enrollment = Enrollment(**enrollment_data.model_dump())
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)

    # Notify based on role
    if enrollment.role == EnrollmentRole.student:
        _queue_student_enrollment_notifications(course, [enrollment.user_id])
    elif enrollment.role == EnrollmentRole.teacher:
        _queue_teacher_assignment_notifications(course, [enrollment.user_id])

    return enrollment


def delete_enrollment(db: Session, enrollment_id: int) -> bool:
    """Delete enrollment"""
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        return False
    
    db.delete(enrollment)
    db.commit()
    return True


# ============ Excel Import ============
def import_users_from_excel(db: Session, file: UploadFile) -> ImportResult:
    """Import users from Excel file with only email and role columns"""
    try:
        contents = file.file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        # Normalize column names to lowercase for case-insensitive matching
        df.columns = df.columns.str.strip().str.lower()
        
        # Required columns: email and role only
        required_columns = ['email', 'role']
        if not all(col in df.columns for col in required_columns):
            raise HTTPException(
                status_code=400,
                detail=f"File Excel phải có các cột: {', '.join(required_columns)} (không phân biệt chữ hoa/thường)"
            )
        
        success_count = 0
        failed_count = 0
        errors = []
        
        for idx, row in df.iterrows():
            try:
                # Get email and validate
                email = str(row['email']).strip().lower()
                if not email or email == 'nan':
                    errors.append(f"Dòng {idx + 2}: Email trống")
                    failed_count += 1
                    continue
                
                # Validate role
                role_value = str(row['role']).strip().lower()
                if role_value not in ['student', 'teacher', 'admin']:
                    errors.append(f"Dòng {idx + 2}: Role không hợp lệ '{row['role']}' (phải là student, teacher hoặc admin)")
                    failed_count += 1
                    continue
                
                # Check if user exists
                existing = db.query(User).filter(User.email == email).first()
                if existing:
                    errors.append(f"Dòng {idx + 2}: Email '{email}' đã tồn tại")
                    failed_count += 1
                    continue
                
                # Create user with is_active = True by default
                user = User(
                    email=email,
                    role=UserRole(role_value),
                    is_active=True,  # Default to active
                    full_name=None  # Will be filled when user logs in with Google
                )
                db.add(user)
                success_count += 1
                
            except Exception as e:
                errors.append(f"Dòng {idx + 2}: {str(e)}")
                failed_count += 1
        
        # Commit all successful users
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Lỗi lưu dữ liệu: {str(e)}")
        
        return ImportResult(
            success=success_count,
            failed=failed_count,
            errors=errors,
            message=f"Import thành công {success_count} người dùng, thất bại {failed_count}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi đọc file Excel: {str(e)}")


def import_courses_from_excel(db: Session, file: UploadFile) -> ImportResult:
    """Import courses from Excel file"""
    try:
        contents = file.file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        # Normalize column names to lowercase
        df.columns = df.columns.str.strip().str.lower()
        
        required_columns = ['code', 'name']
        if not all(col in df.columns for col in required_columns):
            raise HTTPException(
                status_code=400,
                detail=f"File Excel phải có các cột: {', '.join(required_columns)} (không phân biệt chữ hoa/thường)"
            )
        
        success_count = 0
        failed_count = 0
        errors = []
        
        for idx, row in df.iterrows():
            try:
                course_data = CourseCreate(
                    code=row['code'],
                    name=row['name'],
                    description=row.get('description'),
                    semester=row.get('semester'),
                    is_active=row.get('is_active', True)
                )
                
                # Check if course exists
                existing = db.query(Course).filter(Course.code == course_data.code).first()
                if existing:
                    errors.append(f"Dòng {idx + 2}: Mã môn học '{course_data.code}' đã tồn tại")
                    failed_count += 1
                    continue
                
                course = Course(**course_data.model_dump())
                db.add(course)
                success_count += 1
                
            except Exception as e:
                errors.append(f"Dòng {idx + 2}: {str(e)}")
                failed_count += 1
        
        db.commit()
        
        return ImportResult(
            success=success_count,
            failed=failed_count,
            errors=errors,
            message=f"Import thành công {success_count} môn học, thất bại {failed_count}"
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi đọc file Excel: {str(e)}")


def import_enrollments_from_excel(db: Session, file: UploadFile) -> ImportResult:
    """Import enrollments from Excel file"""
    try:
        contents = file.file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        # Normalize column names to lowercase
        df.columns = df.columns.str.strip().str.lower()
        
        required_columns = ['user_email', 'course_code', 'role']
        if not all(col in df.columns for col in required_columns):
            raise HTTPException(
                status_code=400,
                detail=f"File Excel phải có các cột: {', '.join(required_columns)} (không phân biệt chữ hoa/thường)"
            )
        
        success_count = 0
        failed_count = 0
        errors = []
        # course_id -> {student_ids: [], teacher_ids: [], course_obj: Course}
        notif_map: dict = {}

        for idx, row in df.iterrows():
            try:
                # Find user by email
                user = db.query(User).filter(User.email == row['user_email']).first()
                if not user:
                    errors.append(f"Dòng {idx + 2}: Không tìm thấy user với email '{row['user_email']}'")
                    failed_count += 1
                    continue
                
                # Check if user is active
                if not user.is_active:
                    errors.append(f"Dòng {idx + 2}: Người dùng '{row['user_email']}' đã bị vô hiệu hóa")
                    failed_count += 1
                    continue
                
                # Find course by code
                course = db.query(Course).filter(Course.code == row['course_code']).first()
                if not course:
                    errors.append(f"Dòng {idx + 2}: Không tìm thấy môn học với mã '{row['course_code']}'")
                    failed_count += 1
                    continue
                
                # Validate role
                role_value = str(row['role']).lower()
                if role_value not in ['student', 'teacher']:
                    errors.append(f"Dòng {idx + 2}: Role không hợp lệ '{row['role']}'")
                    failed_count += 1
                    continue
                
                # Check if enrollment exists
                existing = db.query(Enrollment).filter(
                    Enrollment.user_id == user.id,
                    Enrollment.course_id == course.id
                ).first()
                if existing:
                    errors.append(f"Dòng {idx + 2}: Đã đăng ký môn học này")
                    failed_count += 1
                    continue
                
                enrollment = Enrollment(
                    user_id=user.id,
                    course_id=course.id,
                    role=EnrollmentRole(role_value)
                )
                db.add(enrollment)
                success_count += 1

                # Track for notification (group by course)
                if course.id not in notif_map:
                    notif_map[course.id] = {"course": course, "students": [], "teachers": []}
                if role_value == "student":
                    notif_map[course.id]["students"].append(user.id)
                else:
                    notif_map[course.id]["teachers"].append(user.id)
                
            except Exception as e:
                errors.append(f"Dòng {idx + 2}: {str(e)}")
                failed_count += 1
        
        db.commit()

        # Send notifications per course
        for entry in notif_map.values():
            _queue_student_enrollment_notifications(entry["course"], entry["students"])
            _queue_teacher_assignment_notifications(entry["course"], entry["teachers"])

        return ImportResult(
            success=success_count,
            failed=failed_count,
            errors=errors,
            message=f"Import thành công {success_count} đăng ký, thất bại {failed_count}"
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi đọc file Excel: {str(e)}")


def import_students_for_course(db: Session, course_id: int, teacher_id: int, contents: bytes, filename: str = "") -> ImportResult:
    """Import users into a specific course from Excel or CSV.

    Only the teacher enrolled in this course (or admin) may call this.
    Required column: email
    
    Logic:
    - Find user by email (must exist in system)
    - Check user's role (student or teacher)
    - Enroll with appropriate role based on user's role
    - Skip if already enrolled
    """
    import re

    EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

    # Verify teacher teaches this course
    from app.models.subject import Course
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Không tìm thấy môn học")

    is_enrolled_as_teacher = db.query(Enrollment).filter(
        Enrollment.course_id == course_id,
        Enrollment.user_id == teacher_id,
        Enrollment.role == EnrollmentRole.teacher,
    ).first()
    teacher_user = db.query(User).filter(User.id == teacher_id).first()
    if not is_enrolled_as_teacher and (not teacher_user or teacher_user.role != UserRole.admin):
        raise HTTPException(status_code=403, detail="Bạn không có quyền import người dùng vào lớp này")

    normalized_filename = (filename or "").strip().lower()

    try:
        if normalized_filename.endswith('.csv'):
            df = None
            last_decode_error = None
            csv_attempts = (
                {"encoding": "utf-8-sig"},
                {"encoding": "utf-8-sig", "sep": ";"},
                {"encoding": "utf-8-sig", "sep": "\t"},
                {"encoding": "latin1"},
                {"encoding": "latin1", "sep": ";"},
                {"encoding": "latin1", "sep": "\t"},
            )

            for csv_options in csv_attempts:
                try:
                    candidate_df = pd.read_csv(io.BytesIO(contents), **csv_options)
                except UnicodeDecodeError as exc:
                    last_decode_error = exc
                    continue

                df = candidate_df
                candidate_df.columns = candidate_df.columns.str.strip().str.lower()
                if 'email' in candidate_df.columns:
                    df = candidate_df
                    break

            if df is None and last_decode_error is not None:
                raise last_decode_error
        elif normalized_filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="File phải có định dạng Excel (.xlsx, .xls) hoặc CSV (.csv)")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi đọc file: {str(e)}")

    # Normalize column names to lowercase
    df.columns = df.columns.str.strip().str.lower()

    if 'email' not in df.columns:
        raise HTTPException(
            status_code=400, 
            detail="File import phải có cột 'email'"
        )

    success_count = 0
    skipped_count = 0
    failed_count = 0
    errors: list = []
    new_student_ids: list = []
    new_teacher_ids: list = []

    for idx, row in df.iterrows():
        row_num = idx + 2  # 1-indexed + header row
        try:
            email = str(row.get('email', '')).strip().lower()
            if not email or email == 'nan':
                errors.append(f"Dòng {row_num}: Email trống")
                failed_count += 1
                continue

            if not EMAIL_RE.match(email):
                errors.append(f"Dòng {row_num}: Email không hợp lệ '{email}'")
                failed_count += 1
                continue

            # Find user by email - MUST exist
            user = db.query(User).filter(User.email == email).first()
            if not user:
                errors.append(f"Dòng {row_num}: Email '{email}' không tồn tại trong hệ thống")
                failed_count += 1
                continue
            
            # Check if user is active
            if not user.is_active:
                errors.append(f"Dòng {row_num}: Người dùng '{email}' đã bị vô hiệu hóa")
                failed_count += 1
                continue

            # Determine enrollment role based on user's role
            if user.role == UserRole.student:
                enrollment_role = EnrollmentRole.student
            elif user.role == UserRole.teacher:
                enrollment_role = EnrollmentRole.teacher
            else:
                # Admin users are not enrolled in courses
                errors.append(f"Dòng {row_num}: Không thể thêm admin '{email}' vào lớp")
                failed_count += 1
                continue

            # Skip if already enrolled
            existing = db.query(Enrollment).filter(
                Enrollment.user_id == user.id,
                Enrollment.course_id == course_id,
            ).first()
            
            if existing:
                skipped_count += 1
                continue

            # Create enrollment
            enrollment = Enrollment(
                user_id=user.id,
                course_id=course_id,
                role=enrollment_role,
            )
            db.add(enrollment)
            
            # Track for notifications
            if enrollment_role == EnrollmentRole.student:
                new_student_ids.append(user.id)
            else:
                new_teacher_ids.append(user.id)
            
            success_count += 1

        except Exception as e:
            errors.append(f"Dòng {row_num}: {str(e)}")
            failed_count += 1

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi lưu dữ liệu: {str(e)}")

    # Notify newly enrolled users
    _queue_student_enrollment_notifications(course, new_student_ids)
    _queue_teacher_assignment_notifications(course, new_teacher_ids)

    skip_note = f", bỏ qua {skipped_count} đã đăng ký" if skipped_count else ""
    return ImportResult(
        success=success_count,
        failed=failed_count,
        errors=errors,
        message=f"Import thành công {success_count} người{skip_note}, thất bại {failed_count}",
    )


# ============ Statistics ============
def _first_day_prev_month(first_this_month: datetime) -> datetime:
    if first_this_month.month == 1:
        return first_this_month.replace(year=first_this_month.year - 1, month=12, day=1)
    return first_this_month.replace(month=first_this_month.month - 1, day=1)


def get_admin_statistics(db: Session) -> dict:
    """Get admin dashboard statistics (counts + signup comparison for current vs previous month)."""
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_students = db.query(func.count(User.id)).filter(User.role == UserRole.student).scalar() or 0
    total_teachers = db.query(func.count(User.id)).filter(User.role == UserRole.teacher).scalar() or 0
    total_admins = db.query(func.count(User.id)).filter(User.role == UserRole.admin).scalar() or 0
    total_courses = db.query(func.count(Course.id)).scalar() or 0
    total_enrollments = db.query(func.count(Enrollment.id)).scalar() or 0

    documents_ready = (
        db.query(func.count(Document.id)).filter(Document.status == DocumentStatus.READY).scalar() or 0
    )
    conversations_count = db.query(func.count(Conversation.id)).scalar() or 0
    messages_count = db.query(func.count(Message.id)).scalar() or 0

    now = datetime.utcnow()
    first_this_month = datetime(now.year, now.month, 1)
    first_last_month = _first_day_prev_month(first_this_month)

    new_users_this_month = (
        db.query(func.count(User.id)).filter(User.created_at >= first_this_month).scalar() or 0
    )
    new_users_last_month = (
        db.query(func.count(User.id))
        .filter(User.created_at >= first_last_month, User.created_at < first_this_month)
        .scalar()
        or 0
    )

    return {
        "total_users": int(total_users),
        "total_students": int(total_students),
        "total_teachers": int(total_teachers),
        "total_admins": int(total_admins),
        "total_courses": int(total_courses),
        "total_enrollments": int(total_enrollments),
        "documents_ready": int(documents_ready),
        "conversations_count": int(conversations_count),
        "messages_count": int(messages_count),
        "new_users_this_month": int(new_users_this_month),
        "new_users_last_month": int(new_users_last_month),
    }


def get_admin_activity_days(db: Session, days: int = 7) -> dict:
    """Messages per calendar day (UTC server date) for the last `days` days; quizzes_count reserved."""
    end = datetime.utcnow().date()
    start = end - timedelta(days=days - 1)
    start_dt = datetime.combine(start, datetime.min.time())
    end_dt = datetime.combine(end + timedelta(days=1), datetime.min.time())

    rows = (
        db.query(func.date(Message.created_at).label("d"), func.count(Message.id))
        .filter(Message.created_at >= start_dt, Message.created_at < end_dt)
        .group_by(func.date(Message.created_at))
        .all()
    )
    counts = {}
    for r in rows:
        key = r[0]
        if hasattr(key, "isoformat"):
            counts[key.isoformat()] = int(r[1])
        else:
            counts[str(key)] = int(r[1])

    out_days = []
    d = start
    while d <= end:
        ds = d.isoformat()
        out_days.append(
            {"date": ds, "messages_count": int(counts.get(ds, 0)), "quizzes_count": 0}
        )
        d += timedelta(days=1)

    return {"days": out_days}


def get_admin_traffic_today(db: Session) -> dict:
    """Hourly message counts for UTC calendar today."""
    now = datetime.utcnow()
    today = now.date()
    start_dt = datetime.combine(today, datetime.min.time())
    end_dt = start_dt + timedelta(days=1)

    hour_col = extract("hour", Message.created_at).label("hr")
    rows = (
        db.query(hour_col, func.count(Message.id))
        .filter(Message.created_at >= start_dt, Message.created_at < end_dt)
        .group_by(hour_col)
        .all()
    )
    hour_map: dict = {}
    for r in rows:
        h = int(r[0])
        hour_map[h] = int(r[1])

    hours = []
    for h in range(24):
        hours.append({"hour": f"{h:02d}:00", "message_count": int(hour_map.get(h, 0))})

    return {"hours": hours}


def get_recent_users(db: Session, limit: int = 5) -> List[User]:
    return db.query(User).order_by(User.created_at.desc()).limit(limit).all()
