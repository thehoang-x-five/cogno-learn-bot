from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional

from app.database.db import get_db
from app.dependencies.deps import get_current_user
from app.models.user import User, UserRole
from app.schemas.admin import CourseResponse, CourseWithEnrollmentsResponse, ImportResult
from app.services.course_service import get_course_service
from app.services import admin_service

router = APIRouter(prefix="/api/courses", tags=["Courses"])


@router.get("/my-courses", response_model=dict)
def get_my_courses(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    course_service = Depends(get_course_service)
):
    """
    Get courses của user hiện tại với enrollment counts.
    
    - Admin: xem tất cả courses
    - Teacher/Student: xem courses mình tham gia
    """
    courses, total = course_service.get_user_courses(db, current_user, skip, limit)
    
    return {
        "items": courses,  # Already CourseWithEnrollmentsResponse objects
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/{course_id}/detail", response_model=CourseWithEnrollmentsResponse)
def get_course_detail(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    course_service = Depends(get_course_service)
):
    """
    Get chi tiết course bao gồm danh sách teachers, students, documents.
    
    - Admin: xem bất kỳ course nào
    - Teacher/Student: chỉ xem course mình tham gia
    """
    course_detail = course_service.get_course_detail(db, course_id, current_user)
    if not course_detail:
        raise HTTPException(status_code=404, detail="Không tìm thấy môn học")
    
    return course_detail


@router.get("/{course_id}/can-upload", response_model=dict)
def check_upload_permission(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    course_service = Depends(get_course_service)
):
    """
    Kiểm tra xem user có quyền upload document vào course không.
    
    Returns: {"can_upload": true/false, "role": "admin"/"teacher"/null}
    """
    can_upload, role = course_service.check_upload_permission(db, course_id, current_user)
    
    return {
        "can_upload": can_upload,
        "role": role,
        "message": "Có quyền upload" if can_upload else "Không có quyền upload"
    }


@router.post("/{course_id}/import-students", response_model=ImportResult)
async def import_students(
    course_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Import danh sách sinh viên vào môn học từ file Excel.

    Chỉ Giáo viên đứng lớp hoặc Admin mới có quyền gọi endpoint này.

    Cột bắt buộc: email
    Cột tùy chọn: full_name (dùng khi tự động tạo tài khoản mới)
    """
    filename = (file.filename or "").strip()
    if not filename.lower().endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(status_code=400, detail="File phải có định dạng Excel (.xlsx, .xls) hoặc CSV (.csv)")

    # Read file content asynchronously to avoid empty-read in async handler
    contents = await file.read()
    return admin_service.import_students_for_course(db, course_id, current_user.id, contents, filename)


@router.post("/{course_id}/enrollments", status_code=status.HTTP_201_CREATED)
def add_enrollment_to_course(
    course_id: int,
    enrollment_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    course_service = Depends(get_course_service)
):
    """
    Thêm người dùng vào khóa học.
    
    - Admin: có thể thêm bất kỳ ai vào bất kỳ khóa học nào
    - Teacher: chỉ có thể thêm vào khóa học mình dạy
    """
    from app.models.subject import Enrollment, EnrollmentRole
    from app.schemas.admin import EnrollmentCreate
    
    # Check permission
    can_manage = False
    if current_user.role == UserRole.admin:
        can_manage = True
    else:
        # Check if user is teacher of this course
        teacher_enrollment = db.query(Enrollment).filter(
            Enrollment.user_id == current_user.id,
            Enrollment.course_id == course_id,
            Enrollment.role == EnrollmentRole.teacher
        ).first()
        if teacher_enrollment:
            can_manage = True
    
    if not can_manage:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền thêm người dùng vào khóa học này"
        )
    
    # Create enrollment
    enrollment_create = EnrollmentCreate(
        user_id=enrollment_data['user_id'],
        course_id=course_id,
        role=enrollment_data['role']
    )
    
    return admin_service.create_enrollment(db, enrollment_create)


@router.delete("/{course_id}/enrollments/{enrollment_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_enrollment_from_course(
    course_id: int,
    enrollment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Xóa người dùng khỏi khóa học.
    
    - Admin: có thể xóa bất kỳ ai khỏi bất kỳ khóa học nào
    - Teacher: chỉ có thể xóa khỏi khóa học mình dạy
    """
    from app.models.subject import Enrollment, EnrollmentRole
    
    # Get enrollment to check course_id
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Không tìm thấy đăng ký")
    
    if enrollment.course_id != course_id:
        raise HTTPException(status_code=400, detail="Enrollment không thuộc khóa học này")
    
    # Check permission
    can_manage = False
    if current_user.role == UserRole.admin:
        can_manage = True
    else:
        # Check if user is teacher of this course
        teacher_enrollment = db.query(Enrollment).filter(
            Enrollment.user_id == current_user.id,
            Enrollment.course_id == course_id,
            Enrollment.role == EnrollmentRole.teacher
        ).first()
        if teacher_enrollment:
            can_manage = True
    
    if not can_manage:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xóa người dùng khỏi khóa học này"
        )
    
    if not admin_service.delete_enrollment(db, enrollment_id):
        raise HTTPException(status_code=404, detail="Không tìm thấy đăng ký")
