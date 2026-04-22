"""Pydantic schemas for system / LLM settings."""
from typing import Optional

from pydantic import BaseModel, Field


def _default_config() -> dict:
    from app.config import settings

    return {
        "provider": "gemini",
        "model": settings.GEMINI_MODEL,
        "gemini_api_key": None,
        "temperature": 0.7,
        "max_tokens": 4096,
        "system_prompt": "",
        "system_prompt_override": False,
        "chunk_size": 1024,
        "chunk_overlap": 200,
        "top_k": 5,
        "embedding_model": settings.EMBEDDING_MODEL,
    }


class SystemSettingsPublic(BaseModel):
    """Returned to admin — never includes raw API key."""

    provider: str = "gemini"
    model: str
    temperature: float = 0.7
    max_tokens: int = 4096
    system_prompt: str = ""
    system_prompt_override: bool = False
    gemini_api_key_configured: bool = False
    gemini_api_key_last4: Optional[str] = None
    chunk_size: int = 1024
    chunk_overlap: int = 200
    top_k: int = 5
    embedding_model: str
    # Read-only aggregates (MySQL)
    total_chunks: int = 0
    total_documents: int = 0
    embedding_dimension: int = 384


class SystemSettingsUpdate(BaseModel):
    """Partial update; omit gemini_api_key to keep existing key."""

    provider: Optional[str] = None
    model: Optional[str] = Field(default=None, max_length=120)
    gemini_api_key: Optional[str] = Field(default=None, max_length=512)
    temperature: Optional[float] = Field(default=None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=None, ge=100, le=32000)
    system_prompt: Optional[str] = None
    system_prompt_override: Optional[bool] = None
    chunk_size: Optional[int] = Field(default=None, ge=128, le=8192)
    chunk_overlap: Optional[int] = Field(default=None, ge=0, le=2048)
    top_k: Optional[int] = Field(default=None, ge=1, le=50)
    embedding_model: Optional[str] = Field(default=None, max_length=200)
