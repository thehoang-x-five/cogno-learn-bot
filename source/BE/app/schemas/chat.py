
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════
# CONVERSATION
# ═══════════════════════════════════════════════════════

class ConversationCreate(BaseModel):
    course_id: int
    title: Optional[str] = Field(None, max_length=200)


class ConversationResponse(BaseModel):
    id: int
    user_id: int
    course_id: int
    title: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime] = None
    message_count: int = 0

    class Config:
        from_attributes = True


class ConversationListResponse(BaseModel):
    results: List[ConversationResponse]
    total: int = 0


# ═══════════════════════════════════════════════════════
# CITATION
# ═══════════════════════════════════════════════════════

class CitationResponse(BaseModel):
    id: int
    chunk_id: Optional[int] = None
    document_title: Optional[str] = None
    page_number: Optional[int] = None
    relevance_score: Optional[float] = None
    quote: Optional[str] = None

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════
# MESSAGE
# ═══════════════════════════════════════════════════════

class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)
    model: Optional[str] = Field(None, description="Specific LLM model to use")


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    tokens_used: Optional[int] = None
    model_used: Optional[str] = None
    trace_id: Optional[str] = None
    citations: List[CitationResponse] = []
    created_at: datetime
    total_time_ms: Optional[int] = None  # Total processing time in milliseconds
    retrieval_fallback: Optional[bool] = None  # Whether RAG fallback was used
    agent_metadata: Optional[dict] = None  # Quiz/Agent metadata (quiz_id, quiz_title, etc.)

    class Config:
        from_attributes = True


class ConversationDetailResponse(BaseModel):
    """Conversation + messages list."""
    id: int
    user_id: int
    course_id: int
    title: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime] = None
    messages: List[MessageResponse] = []

    class Config:
        from_attributes = True


# ═══════════════════════════════════════════════════════
# SSE EVENT TYPES (kế thừa từ RAG-Anything ChatPipeline)
# ═══════════════════════════════════════════════════════

class SSETokenEvent(BaseModel):
    """SSE event: token fragment."""
    type: str = "token"
    content: str
    index: int = 0


class SSECitationsEvent(BaseModel):
    """SSE event: citations list."""
    type: str = "citations"
    citations: List[Dict[str, Any]]
    trace_id: Optional[str] = None


class SSEMetadataEvent(BaseModel):
    """SSE event: metadata (model, timing, quality)."""
    type: str = "metadata"
    trace_id: Optional[str] = None
    model: Optional[str] = None
    tokens_used: Optional[int] = None
    total_time_ms: Optional[int] = None


class SSEDoneEvent(BaseModel):
    """SSE event: stream complete."""
    type: str = "done"
    trace_id: Optional[str] = None
    total_time_ms: Optional[int] = None


class SSEErrorEvent(BaseModel):
    """SSE event: error."""
    type: str = "error"
    message: str
    code: Optional[str] = None
