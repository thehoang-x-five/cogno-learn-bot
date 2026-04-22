"""
Load / merge application settings from DB with env fallback.
Singleton row: SystemSettings.id == 1
"""
import json
import logging
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.config import settings
from app.models.system_settings import SystemSettings
from app.schemas.settings import SystemSettingsUpdate, _default_config

logger = logging.getLogger(__name__)

SETTINGS_ROW_ID = 1


def _deep_merge(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(base)
    for k, v in override.items():
        if v is not None:
            out[k] = v
    return out


def _ensure_row(db: Session) -> SystemSettings:
    row = db.query(SystemSettings).filter(SystemSettings.id == SETTINGS_ROW_ID).first()
    if row is None:
        row = SystemSettings(
            id=SETTINGS_ROW_ID,
            config_json=json.dumps(_default_config(), ensure_ascii=False),
        )
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def get_config_dict(db: Session) -> Dict[str, Any]:
    """Raw merged config: DB JSON merged on top of defaults."""
    row = _ensure_row(db)
    try:
        stored = json.loads(row.config_json) if row.config_json else {}
    except json.JSONDecodeError:
        stored = {}
    merged = _deep_merge(_default_config(), stored)
    return merged


def get_effective_llm_config(db: Session) -> Dict[str, Any]:
    """
    Effective LLM parameters for ChatService / LLMService.
    API key: DB value if set, else env GEMINI_API_KEY.
    """
    c = get_config_dict(db)
    key = c.get("gemini_api_key")
    if not key or not str(key).strip():
        key = settings.GEMINI_API_KEY
    return {
        "provider": c.get("provider") or "gemini",
        "model": c.get("model") or settings.GEMINI_MODEL,
        "api_key": key or "",
        "base_url": settings.GEMINI_BASE_URL,
        "temperature": float(c.get("temperature", 0.7)),
        "max_tokens": int(c.get("max_tokens", 4096)),
        "system_prompt": (c.get("system_prompt") or "").strip(),
        "system_prompt_override": bool(c.get("system_prompt_override", False)),
    }


def get_effective_rag_config(db: Session) -> Dict[str, Any]:
    c = get_config_dict(db)
    return {
        "chunk_size": int(c.get("chunk_size", 1024)),
        "chunk_overlap": int(c.get("chunk_overlap", 200)),
        "top_k": int(c.get("top_k", 5)),
        "embedding_model": c.get("embedding_model") or settings.EMBEDDING_MODEL,
    }


def mask_key_last4(raw: Optional[str]) -> Optional[str]:
    if not raw or len(raw) < 4:
        return None
    return raw[-4:]


def config_to_public(db: Session, include_stats: bool = True) -> Dict[str, Any]:
    """Shape for GET /api/admin/settings (no secrets)."""
    c = get_config_dict(db)
    raw_key = c.get("gemini_api_key")
    env_fallback = not (raw_key and str(raw_key).strip())
    effective_key = settings.GEMINI_API_KEY if env_fallback else str(raw_key).strip()
    configured = bool(effective_key and effective_key.strip())

    out = {
        "provider": c.get("provider") or "gemini",
        "model": c.get("model") or settings.GEMINI_MODEL,
        "temperature": float(c.get("temperature", 0.7)),
        "max_tokens": int(c.get("max_tokens", 4096)),
        "system_prompt": c.get("system_prompt") or "",
        "system_prompt_override": bool(c.get("system_prompt_override", False)),
        "gemini_api_key_configured": configured,
        "gemini_api_key_last4": mask_key_last4(effective_key) if configured else None,
        "chunk_size": int(c.get("chunk_size", 1024)),
        "chunk_overlap": int(c.get("chunk_overlap", 200)),
        "top_k": int(c.get("top_k", 5)),
        "embedding_model": c.get("embedding_model") or settings.EMBEDDING_MODEL,
        "embedding_dimension": settings.EMBEDDING_DIMENSION,
        "total_chunks": 0,
        "total_documents": 0,
    }
    if include_stats:
        try:
            from sqlalchemy import func
            from app.models.document import Document, DocumentChunk

            out["total_chunks"] = int(db.query(func.count(DocumentChunk.id)).scalar() or 0)
            out["total_documents"] = int(db.query(func.count(Document.id)).scalar() or 0)
        except Exception as e:
            logger.warning("settings stats query failed: %s", e)
    return out


def apply_update(db: Session, body: SystemSettingsUpdate) -> Dict[str, Any]:
    """Apply pydantic model_dump(exclude_unset=True) onto stored JSON."""
    row = _ensure_row(db)
    try:
        current = json.loads(row.config_json) if row.config_json else {}
    except json.JSONDecodeError:
        current = {}
    base = _deep_merge(_default_config(), current)

    data = body.model_dump(exclude_unset=True)

    # API key: only update if client sends a non-empty new value (not a mask)
    if "gemini_api_key" in data:
        new_k = data.pop("gemini_api_key")
        if new_k is not None:
            s = str(new_k).strip()
            if s and not s.startswith("***") and "************************" not in s:
                base["gemini_api_key"] = s
            # else: keep existing (omit)

    for k, v in data.items():
        if v is not None:
            base[k] = v

    if base.get("provider") and base["provider"] != "gemini":
        logger.warning("Only gemini provider is supported; forcing gemini")
        base["provider"] = "gemini"

    row.config_json = json.dumps(base, ensure_ascii=False)
    db.commit()
    db.refresh(row)
    return base
