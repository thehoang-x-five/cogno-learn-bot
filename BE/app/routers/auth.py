import secrets
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional

from app.database.db import get_db
from app.config import settings
from app.services.auth_service import (
    build_google_auth_url,
    exchange_code_for_google_info,
    get_user_from_google,
    create_access_token,
    create_refresh_token_str,
    save_refresh_token,
    get_valid_refresh_token,
    revoke_refresh_token,
    revoke_all_user_tokens,
    decode_access_token,
    get_user_by_id,
)
from app.models.user import User, UserRole

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
bearer_scheme = HTTPBearer()


# ─────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    avatar_url: Optional[str]
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UpdateMeRequest(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=150)
    avatar_url: Optional[str] = Field(default=None, max_length=500)


class UpdateRoleRequest(BaseModel):
    role: UserRole


# ─────────────────────────────────────────────
# Dependencies
# ─────────────────────────────────────────────

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = get_user_by_id(db, int(user_id))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


def require_teacher_or_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (UserRole.admin, UserRole.teacher):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teacher or Admin access required")
    return current_user


# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────

@router.get("/google/login", summary="Redirect to Google OAuth login page")
def google_login():
    """Generate Google OAuth URL and redirect user to Google consent screen."""
    if not settings.GOOGLE_CLIENT_ID or settings.GOOGLE_CLIENT_ID.startswith("your-"):
        raise HTTPException(status_code=503, detail="Google OAuth not configured. Set GOOGLE_CLIENT_ID in .env")
    state = secrets.token_urlsafe(16)
    auth_url = build_google_auth_url(state)
    return RedirectResponse(url=auth_url)


@router.get("/google/callback", summary="Google OAuth callback")
async def google_callback(
    code: str = Query(..., description="Authorization code from Google"),
    state: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Google OAuth callback:
    1. Exchange code → Google user info
    2. Check if user email exists in DB (must be pre-registered by admin)
    3. If not exists → Reject with 403 error
    4. If exists → Link Google account and issue tokens
    5. Redirect to frontend /auth/callback?access_token=...&refresh_token=...
    """
    try:
        print(f"[DEBUG] Received authorization code: {code[:30]}...")
        print(f"[DEBUG] Using redirect URI: {settings.GOOGLE_REDIRECT_URI}")
        google_info = await exchange_code_for_google_info(code)
        print(f"[DEBUG] Successfully got Google info for: {google_info.get('email')}")
    except Exception as e:
        print(f"[ERROR] Failed to exchange code: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Failed to get Google user info: {str(e)}")

    if not google_info.get("email_verified", False):
        print(f"[ERROR] Email not verified for: {google_info.get('email')}")
        raise HTTPException(status_code=400, detail="Google email is not verified")

    try:
        # Get user from database - email MUST be pre-registered by admin
        print(f"[DEBUG] Looking up user by email: {google_info.get('email')}")
        user = get_user_from_google(db, google_info)
        
        # Reject login if email not found in database
        if not user:
            print(f"[ERROR] User not found in database: {google_info.get('email')}")
            raise HTTPException(
                status_code=403, 
                detail=f"Email '{google_info.get('email')}' chưa được đăng ký trong hệ thống. Vui lòng liên hệ admin để được cấp tài khoản."
            )

        if not user.is_active:
            print(f"[ERROR] User account is inactive: {user.email}")
            raise HTTPException(status_code=403, detail="Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ admin.")

        print(f"[DEBUG] Creating tokens for user: {user.email} (ID: {user.id})")
        access_token = create_access_token({"sub": str(user.id), "role": user.role})
        refresh_token_str = create_refresh_token_str()
        save_refresh_token(db, user.id, refresh_token_str)

        redirect_url = (
            f"{settings.FRONTEND_URL}/auth/callback"
            f"?access_token={access_token}"
            f"&refresh_token={refresh_token_str}"
            f"&role={user.role}"
        )
        print(f"[DEBUG] Redirecting to: {redirect_url[:80]}...")
        return RedirectResponse(url=redirect_url)
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Unexpected error in callback: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/refresh", response_model=TokenResponse, summary="Refresh access token")
def refresh_token(
    body: RefreshRequest,
    db: Session = Depends(get_db),
):
    """
    Exchange a valid refresh token for a new pair (rotation strategy).
    Old token is revoked immediately.
    """
    db_token = get_valid_refresh_token(db, body.refresh_token)
    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is invalid, expired or revoked",
        )

    user = get_user_by_id(db, db_token.user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    # Rotate tokens
    revoke_refresh_token(db, body.refresh_token)
    new_access_token = create_access_token({"sub": str(user.id), "role": user.role})
    new_refresh_token_str = create_refresh_token_str()
    save_refresh_token(db, user.id, new_refresh_token_str)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token_str,
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url,
            "role": user.role,
            "is_active": user.is_active,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
        },
    )


@router.post("/logout", summary="Logout - revoke current refresh token")
def logout(
    body: RefreshRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revoke the provided refresh token (single device logout)."""
    revoke_refresh_token(db, body.refresh_token)
    return {"message": "Logged out successfully"}


@router.post("/logout/all", summary="Logout from all devices")
def logout_all(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revoke ALL refresh tokens of current user."""
    revoke_all_user_tokens(db, current_user.id)
    return {"message": "Logged out from all devices"}


@router.get("/me", response_model=UserResponse, summary="Get current user profile")
def get_me(current_user: User = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    return current_user


@router.patch("/me", response_model=UserResponse, summary="Update current user profile")
def update_me(
    body: UpdateMeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update the authenticated user's own profile (display name and optional avatar URL). Email cannot be changed here."""
    data = body.model_dump(exclude_unset=True)
    if not data:
        return current_user
    if "full_name" in data:
        fn = data["full_name"]
        current_user.full_name = (fn.strip() or None) if isinstance(fn, str) else None
    if "avatar_url" in data:
        au = data["avatar_url"]
        current_user.avatar_url = (au.strip() or None) if isinstance(au, str) else None
    db.commit()
    db.refresh(current_user)
    return current_user


@router.patch("/users/{user_id}/role", response_model=UserResponse, summary="[Admin] Update user role")
def update_user_role(
    user_id: int,
    body: UpdateRoleRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Admin-only: change a user's role (student / teacher / admin)."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = body.role
    db.commit()
    db.refresh(user)
    return user
