"""

Thành viên A hoàn thành auth đầy đủ, chỉ cần update file này.
"""
from fastapi import Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional

from app.database.db import get_db
from app.models.user import User
from app.services.auth_service import decode_access_token

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    Extract current user from JWT Bearer token.
    Uses existing auth_service.decode_access_token().
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc hết hạn",
        )

    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc hết hạn",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không chứa thông tin user",
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị vô hiệu hóa",
        )

    return user


def get_current_user_from_token_or_query(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db),
) -> User:
    """
    Extract current user from JWT Bearer token or query parameter.
    Used for endpoints that need to work in browser (like file viewing).
    """
    # Try to get token from header first
    token_str = None
    if credentials:
        token_str = credentials.credentials
    elif token:
        token_str = token
    
    if not token_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc hết hạn",
        )

    payload = decode_access_token(token_str)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc hết hạn",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không chứa thông tin user",
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị vô hiệu hóa",
        )

    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to check if user is admin.
    """
    from app.models.user import UserRole
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ admin mới có quyền truy cập",
        )
    return current_user


def check_enrollment(db: Session, user: User, course_id: int) -> bool:
    """
    Kiểm tra quyền truy cập môn học theo vai trò (chat_workflow.puml - Bước ①).

    - Admin: bypass — truy cập tất cả môn học.
    - Teacher/Student: phải có bản ghi trong bảng Enrollment.
    """
    from app.models.user import UserRole
    from app.models.subject import Enrollment

    # Admin bypass — full access
    if user.role == UserRole.admin:
        return True

    # Teacher & Student must be enrolled
    enrollment = (
        db.query(Enrollment)
        .filter(
            Enrollment.user_id == user.id,
            Enrollment.course_id == course_id,
        )
        .first()
    )
    return enrollment is not None
