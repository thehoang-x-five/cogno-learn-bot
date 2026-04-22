from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.document import FileType, DocumentStatus


# ============ Request Schemas ============

class DocumentUploadResponse(BaseModel):
    id: int
    filename: str
    file_type: FileType
    file_size: int
    status: DocumentStatus
    message: str

    class Config:
        from_attributes = True


# ============ Response Schemas ============

class DocumentChunkResponse(BaseModel):
    id: int
    chunk_index: int
    content: str
    page_number: Optional[int] = None
    heading: Optional[str] = None

    class Config:
        from_attributes = True


class DocumentResponse(BaseModel):
    id: int
    course_id: int
    uploaded_by: Optional[int] = None
    filename: str
    file_path: Optional[str] = None
    file_type: Optional[FileType] = None
    file_size: Optional[int] = None
    status: DocumentStatus
    progress: int = 0
    total_chunks: int = 0
    processing_time_ms: Optional[int] = None
    embedding_model: Optional[str] = None
    created_at: datetime
    
    # Relationships
    uploader_name: Optional[str] = None
    course_name: Optional[str] = None

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    items: List[DocumentResponse]
    total: int
    skip: int
    limit: int


class DocumentDetailResponse(DocumentResponse):
    chunks: List[DocumentChunkResponse] = []

    class Config:
        from_attributes = True
