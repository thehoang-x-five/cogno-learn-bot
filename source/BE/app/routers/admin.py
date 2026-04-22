from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
import logging

from app.database.db import get_db
from app.dependencies.deps import get_current_user
from app.models.user import User, UserRole
from app.models.subject import EnrollmentRole
from app.schemas.admin import (
    UserCreate, UserUpdate, UserResponse,
    CourseCreate, CourseUpdate, CourseResponse,
    CourseCreateWithEnrollments,
    EnrollmentCreate, EnrollmentResponse,
    ImportResult, AdminStats,
    AdminActivityResponse,
    AdminTrafficTodayResponse,
    RecentUsersResponse,
)
from app.schemas.settings import SystemSettingsPublic, SystemSettingsUpdate
from app.services import admin_service
from app.services.app_settings_service import apply_update, config_to_public

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["Admin"])


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to check if user is admin"""
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ admin mới có quyền truy cập"
        )
    return current_user


# ============ Statistics ============
@router.get("/statistics", response_model=AdminStats)
def get_statistics(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get admin dashboard statistics"""
    return admin_service.get_admin_statistics(db)


@router.get("/dashboard/activity", response_model=AdminActivityResponse)
def get_dashboard_activity(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Messages per day for charts (UTC)."""
    return admin_service.get_admin_activity_days(db, days=days)


@router.get("/dashboard/traffic-today", response_model=AdminTrafficTodayResponse)
def get_dashboard_traffic_today(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Hourly message volume for today (UTC)."""
    return admin_service.get_admin_traffic_today(db)


# ============ User Management ============
@router.get("/users/test-simple")
def test_simple(
    role: Optional[str] = None,
    is_active: Optional[str] = None,
):
    """Simplest test endpoint"""
    return {"role": role, "is_active": is_active}


@router.get("/users/test")
def test_users_endpoint(
    role: Optional[str] = None,
    is_active: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
):
    """Test endpoint to debug parameter passing"""
    return {
        "message": "Test endpoint",
        "received_params": {
            "role": role,
            "is_active": is_active,
            "limit": limit
        }
    }


@router.get("/users")  # Removed response_model=dict
def list_users(
    skip: int = 0,  # Removed Query validator
    limit: int = 100,  # Removed Query validator
    role: Optional[str] = None,
    search: Optional[str] = None,
    is_active: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get list of users with filters and pagination"""
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"[list_users] Received params: role={role}, is_active={is_active}, limit={limit}")
    
    # Validate skip and limit manually
    if skip < 0:
        skip = 0
    if limit < 1:
        limit = 1
    if limit > 500:
        limit = 500
    
    # Convert role string to UserRole enum if provided
    role_enum = None
    if role:
        try:
            role_enum = UserRole(role)
        except ValueError:
            logger.error(f"[list_users] Invalid role: {role}")
            raise HTTPException(status_code=400, detail=f"Invalid role: {role}")
    
    # Convert is_active string to boolean
    is_active_bool = None
    if is_active is not None:
        if is_active.lower() in ('true', '1', 'yes'):
            is_active_bool = True
        elif is_active.lower() in ('false', '0', 'no'):
            is_active_bool = False
        else:
            logger.error(f"[list_users] Invalid is_active: {is_active}")
            raise HTTPException(status_code=400, detail=f"Invalid is_active value: {is_active}")
    
    logger.info(f"[list_users] Converted: role_enum={role_enum}, is_active_bool={is_active_bool}")
    
    try:
        users, total = admin_service.get_users(db, skip, limit, role_enum, search, is_active_bool)
        logger.info(f"[list_users] Found {total} users, returning {len(users)} items")
        
        # Convert users to dict manually to avoid validation issues
        items = []
        for u in users:
            try:
                items.append(UserResponse.model_validate(u).model_dump())
            except Exception as e:
                logger.error(f"[list_users] Error validating user {u.id}: {e}")
                raise
        
        result = {
            "items": items,
            "total": total,
            "skip": skip,
            "limit": limit
        }
        logger.info(f"[list_users] Returning response with {len(items)} items")
        return result
    except Exception as e:
        logger.error(f"[list_users] Error: {e}", exc_info=True)
        raise


@router.get("/users/recent", response_model=RecentUsersResponse)
def list_recent_users(
    limit: int = Query(5, ge=1, le=50),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Most recently registered users."""
    users = admin_service.get_recent_users(db, limit=limit)
    return RecentUsersResponse(items=[UserResponse.model_validate(u) for u in users])


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get user by ID"""
    user = admin_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    return user


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Create new user"""
    return admin_service.create_user(db, user_data)


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Update user"""
    user = admin_service.update_user(db, user_id, user_data)
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Soft delete user by setting is_active to False"""
    if not admin_service.delete_user(db, user_id):
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")


# ============ Course Management ============
@router.get("/courses", response_model=dict)
def list_courses(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    semester: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get list of courses with filters and pagination"""
    courses, total = admin_service.get_courses(db, skip, limit, search, is_active, semester)
    return {
        "items": [CourseResponse.model_validate(c) for c in courses],
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/courses/{course_id}", response_model=CourseResponse)
def get_course(
    course_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get course by ID"""
    course = admin_service.get_course_by_id(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Không tìm thấy môn học")
    return course


@router.post("/courses", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(
    course_data: CourseCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Create new course (simple, without enrollments)"""
    return admin_service.create_course(db, course_data)


@router.post("/courses/with-enrollments", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course_with_enrollments(
    course_data: CourseCreateWithEnrollments,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Create course with teachers and students at once.
    
    Body:
    {
      "code": "CS101",
      "name": "Lập trình Python",
      "description": "...",
      "semester": "2024-1",
      "teacher_ids": [2, 3],
      "student_ids": [10, 11, 12]
    }
    """
    from app.services.course_service import get_course_service
    course_service = get_course_service()
    try:
        return course_service.create_course_with_enrollments(db, course_data)
    except IntegrityError as e:
        db.rollback()
        logger.warning("create_course_with_enrollments integrity error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã môn học đã tồn tại hoặc dữ liệu người dùng/enrollment không hợp lệ.",
        ) from e


@router.put("/courses/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: int,
    course_data: CourseUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Update course"""
    course = admin_service.update_course(db, course_id, course_data)
    if not course:
        raise HTTPException(status_code=404, detail="Không tìm thấy môn học")
    return course


@router.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(
    course_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Delete course"""
    if not admin_service.delete_course(db, course_id):
        raise HTTPException(status_code=404, detail="Không tìm thấy môn học")


# ============ Enrollment Management ============
@router.get("/enrollments", response_model=dict)
def list_enrollments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    user_id: Optional[int] = None,
    course_id: Optional[int] = None,
    role: Optional[EnrollmentRole] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Get list of enrollments with filters"""
    enrollments, total = admin_service.get_enrollments(db, skip, limit, user_id, course_id, role)
    return {
        "items": [EnrollmentResponse.model_validate(e) for e in enrollments],
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.post("/enrollments", response_model=EnrollmentResponse, status_code=status.HTTP_201_CREATED)
def create_enrollment(
    enrollment_data: EnrollmentCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Create new enrollment"""
    return admin_service.create_enrollment(db, enrollment_data)


@router.delete("/enrollments/{enrollment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_enrollment(
    enrollment_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Delete enrollment"""
    if not admin_service.delete_enrollment(db, enrollment_id):
        raise HTTPException(status_code=404, detail="Không tìm thấy đăng ký")


# ============ Excel Import ============
@router.post("/import/users", response_model=ImportResult)
async def import_users(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Import users from Excel file
    
    Required columns: email, role
    - email: User email address (must be unique)
    - role: User role (student, teacher, or admin)
    
    Notes:
    - is_active defaults to True (active)
    - full_name will be filled when user logs in with Google OAuth
    - Errors on individual rows will not stop the import process
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="File phải có định dạng Excel (.xlsx hoặc .xls)")
    
    return admin_service.import_users_from_excel(db, file)


@router.post("/import/courses", response_model=ImportResult)
async def import_courses(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Import courses from Excel file
    
    Required columns: code, name
    Optional columns: description, semester, is_active
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="File phải có định dạng Excel (.xlsx hoặc .xls)")
    
    return admin_service.import_courses_from_excel(db, file)


@router.post("/import/enrollments", response_model=ImportResult)
async def import_enrollments(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Import enrollments from Excel file
    
    Required columns: user_email, course_code, role
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="File phải có định dạng Excel (.xlsx hoặc .xls)")
    
    return admin_service.import_enrollments_from_excel(db, file)


# ============ System / LLM / RAG Settings ============


@router.get("/settings", response_model=SystemSettingsPublic)
def get_system_settings(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Singleton app settings (LLM + RAG). API key is never returned in full."""
    return config_to_public(db)


@router.put("/settings", response_model=SystemSettingsPublic)
def update_system_settings(
    body: SystemSettingsUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    apply_update(db, body)
    return config_to_public(db)
