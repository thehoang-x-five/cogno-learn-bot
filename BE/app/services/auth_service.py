from datetime import datetime, timedelta, timezone
from typing import Optional
import secrets

from jose import JWTError, jwt
from sqlalchemy.orm import Session
import httpx

from app.config import settings
from app.models.user import User, RefreshToken, UserRole


# ─────────────────────────────────────────────
# JWT helpers
# ─────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token_str() -> str:
    """Generate a secure random refresh token string."""
    return secrets.token_urlsafe(64)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "access":
            return None
        return payload
    except JWTError:
        return None


# ─────────────────────────────────────────────
# RefreshToken DB operations
# ─────────────────────────────────────────────

def save_refresh_token(db: Session, user_id: int, token: str) -> RefreshToken:
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    db_token = RefreshToken(
        token=token,
        user_id=user_id,
        expires_at=expires_at,
        is_revoked=False,
    )
    db.add(db_token)
    db.commit()
    db.refresh(db_token)
    return db_token


def get_valid_refresh_token(db: Session, token: str) -> Optional[RefreshToken]:
    db_token = db.query(RefreshToken).filter(RefreshToken.token == token).first()
    if not db_token:
        return None
    if db_token.is_revoked:
        return None
    if db_token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        return None
    return db_token


def revoke_refresh_token(db: Session, token: str) -> bool:
    db_token = db.query(RefreshToken).filter(RefreshToken.token == token).first()
    if not db_token:
        return False
    db_token.is_revoked = True
    db.commit()
    return True


def revoke_all_user_tokens(db: Session, user_id: int):
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.is_revoked == False,  # noqa: E712
    ).update({"is_revoked": True})
    db.commit()


# ─────────────────────────────────────────────
# User DB operations
# ─────────────────────────────────────────────

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def get_user_by_google_id(db: Session, google_id: str) -> Optional[User]:
    return db.query(User).filter(User.google_id == google_id).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def get_user_from_google(db: Session, google_info: dict) -> Optional[User]:
    """
    Find existing user from Google profile.
    For internal school system: Email MUST exist in database (added by admin).
    
    Flow:
    1. Check if google_id already linked → update info and return
    2. Check if email exists in DB → link Google account, update info (first time only)
    3. Email not found → return None (reject login)
    """
    # Try by google_id first (already linked)
    user = get_user_by_google_id(db, google_info["sub"])
    if user:
        # User already linked - just return (don't overwrite info)
        return user

    # Try by email - user MUST be pre-registered by admin
    user = get_user_by_email(db, google_info["email"])
    if user:
        # First time login - link Google account and save info from provider
        user.google_id = google_info["sub"]
        user.avatar_url = google_info.get("picture")
        # Only update full_name if it's empty (admin didn't set it)
        if not user.full_name:
            user.full_name = google_info.get("name")
        db.commit()
        db.refresh(user)
        return user

    # Email not found in database - reject login
    return None


# ─────────────────────────────────────────────
# Google OAuth helpers
# ─────────────────────────────────────────────

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"


def build_google_auth_url(state: str) -> str:
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "consent",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{GOOGLE_AUTH_URL}?{query}"


async def exchange_code_for_google_info(code: str) -> dict:
    """Exchange authorization code for user info from Google."""
    async with httpx.AsyncClient() as client:
        # Exchange code for token
        token_data_payload = {
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        }
        print(f"[DEBUG] Exchanging code with redirect_uri: {settings.GOOGLE_REDIRECT_URI}")
        
        token_resp = await client.post(GOOGLE_TOKEN_URL, data=token_data_payload)
        
        if token_resp.status_code != 200:
            print(f"[ERROR] Token exchange failed: {token_resp.status_code}")
            print(f"[ERROR] Response: {token_resp.text}")
        
        token_resp.raise_for_status()
        token_data = token_resp.json()
        print(f"[DEBUG] Successfully got access token")

        # Get user info
        userinfo_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )
        userinfo_resp.raise_for_status()
        user_info = userinfo_resp.json()
        print(f"[DEBUG] Got user info for: {user_info.get('email')}")
        return user_info

