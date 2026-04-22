import logging
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from app.models.subject import Course, Enrollment, EnrollmentRole
from app.models.user import User, UserRole
from app.models.document import Document
from app.schemas.admin import (
    CourseCreateWithEnrollments,
    CourseWithEnrollmentsResponse,
    UserResponse
)

logger = logging.getLogger(__name__)


class CourseService:
    """Service for course operations accessible to all users"""

    def get_user_courses(
        self,
        db: Session,
        user: User,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[CourseWithEnrollmentsResponse], int]:
        """
        Get courses của user với enrollment counts.
        
        - Admin: tất cả courses (bao gồm cả is_active = 0)
        - Teacher/Student: courses mình tham gia (bao gồm cả is_active = 0)
        """
        query = db.query(Course)

        if user.role != UserRole.admin:
            # Filter by enrollments
            query = query.join(Enrollment).filter(Enrollment.user_id == user.id)

        # Removed is_active filter to show all courses including closed ones
        total = query.count()
        courses = query.order_by(Course.created_at.desc()).offset(skip).limit(limit).all()

        # Add enrollment counts to each course
        result = []
        for course in courses:
            # Count teachers and students
            teacher_count = db.query(Enrollment).filter(
                Enrollment.course_id == course.id,
                Enrollment.role == EnrollmentRole.teacher
            ).count()
            
            student_count = db.query(Enrollment).filter(
                Enrollment.course_id == course.id,
                Enrollment.role == EnrollmentRole.student
            ).count()
            
            # Count documents
            document_count = db.query(Document).filter(
                Document.course_id == course.id
            ).count()
            
            course_response = CourseWithEnrollmentsResponse(
                id=course.id,
                code=course.code,
                name=course.name,
                description=course.description,
                semester=course.semester,
                is_active=course.is_active,
                created_at=course.created_at,
                teacher_count=teacher_count,
                student_count=student_count,
                document_count=document_count,
                teachers=[],  # Empty for list view
                students=[]   # Empty for list view
            )
            result.append(course_response)

        return result, total

    def get_course_detail(
        self,
        db: Session,
        course_id: int,
        user: User
    ) -> Optional[CourseWithEnrollmentsResponse]:
        """
        Get chi tiết course với teachers, students, documents.
        
        Permission check:
        - Admin: xem bất kỳ course nào
        - Teacher/Student: chỉ xem course mình tham gia
        """
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            return None

        # Check permission
        if user.role != UserRole.admin:
            enrollment = db.query(Enrollment).filter(
                Enrollment.user_id == user.id,
                Enrollment.course_id == course_id
            ).first()
            if not enrollment:
                return None

        # Get enrollments
        enrollments = db.query(Enrollment).filter(
            Enrollment.course_id == course_id
        ).all()

        teachers = []
        students = []
        enrollment_infos = []
        
        for enroll in enrollments:
            # Add enrollment info for management
            from app.schemas.admin import EnrollmentInfo
            enrollment_infos.append(EnrollmentInfo(
                enrollment_id=enroll.id,
                user_id=enroll.user_id,
                role=enroll.role
            ))
            
            if enroll.user:
                user_data = UserResponse.model_validate(enroll.user)
                if enroll.role == EnrollmentRole.teacher:
                    teachers.append(user_data)
                else:
                    students.append(user_data)

        # Count documents
        document_count = db.query(Document).filter(
            Document.course_id == course_id
        ).count()

        return CourseWithEnrollmentsResponse(
            id=course.id,
            code=course.code,
            name=course.name,
            description=course.description,
            semester=course.semester,
            is_active=course.is_active,
            created_at=course.created_at,
            teacher_count=len(teachers),
            student_count=len(students),
            document_count=document_count,
            teachers=teachers,
            students=students,
            enrollments=enrollment_infos
        )

    def check_upload_permission(
        self,
        db: Session,
        course_id: int,
        user: User
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if user can upload documents to course.
        
        Returns: (can_upload, role)
        - Admin: always True, "admin"
        - Teacher of course: True, "teacher"
        - Others: False, None
        """
        if user.role == UserRole.admin:
            return True, "admin"

        enrollment = db.query(Enrollment).filter(
            Enrollment.user_id == user.id,
            Enrollment.course_id == course_id,
            Enrollment.role == EnrollmentRole.teacher
        ).first()

        if enrollment:
            return True, "teacher"

        return False, None

    def create_course_with_enrollments(
        self,
        db: Session,
        course_data: CourseCreateWithEnrollments
    ) -> Course:
        """
        Create course and add teachers + students.
        Only for admin.
        """
        # Validate all users exist and are active
        all_user_ids = set(course_data.teacher_ids + course_data.student_ids)
        if all_user_ids:
            users = db.query(User).filter(User.id.in_(all_user_ids)).all()
            user_map = {u.id: u for u in users}
            
            # Check if all users exist
            missing_ids = all_user_ids - set(user_map.keys())
            if missing_ids:
                raise HTTPException(
                    status_code=404,
                    detail=f"Không tìm thấy người dùng với ID: {', '.join(map(str, missing_ids))}"
                )
            
            # Check if all users are active
            inactive_users = [u for u in users if not u.is_active]
            if inactive_users:
                inactive_names = [u.full_name or u.email for u in inactive_users]
                raise HTTPException(
                    status_code=400,
                    detail=f"Không thể thêm người dùng đã bị vô hiệu hóa: {', '.join(inactive_names)}"
                )
        
        # Create course
        course = Course(
            code=course_data.code,
            name=course_data.name,
            description=course_data.description,
            semester=course_data.semester,
            is_active=course_data.is_active
        )
        db.add(course)
        db.flush()  # Get course ID

        # Add teachers
        for teacher_id in course_data.teacher_ids:
            enrollment = Enrollment(
                user_id=teacher_id,
                course_id=course.id,
                role=EnrollmentRole.teacher
            )
            db.add(enrollment)

        # Add students
        for student_id in course_data.student_ids:
            enrollment = Enrollment(
                user_id=student_id,
                course_id=course.id,
                role=EnrollmentRole.student
            )
            db.add(enrollment)

        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise
        db.refresh(course)

        logger.info(f"Created course {course.id} with {len(course_data.teacher_ids)} teachers and {len(course_data.student_ids)} students")

        # Notify newly enrolled students and teachers (admin-initiated)
        try:
            from app.services.admin_service import (
                _queue_student_enrollment_notifications,
                _queue_teacher_assignment_notifications,
            )
            _queue_student_enrollment_notifications(course, list(course_data.student_ids))
            _queue_teacher_assignment_notifications(course, list(course_data.teacher_ids))
        except Exception as _ne:
            logger.warning(f"[notif] create_course_with_enrollments notification failed: {_ne}")

        return course


# Singleton instance
_service_instance = None


def get_course_service() -> CourseService:
    global _service_instance
    if _service_instance is None:
        _service_instance = CourseService()
    return _service_instance
