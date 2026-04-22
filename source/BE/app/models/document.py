
import enum
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Enum,
    ForeignKey, func, JSON,
)
from sqlalchemy.orm import relationship
from app.database.db import Base


class FileType(str, enum.Enum):
    # Original types
    pdf = "pdf"
    docx = "docx"
    txt = "txt"
    
    # Priority 1: High impact
    pptx = "pptx"  # PowerPoint presentations
    xlsx = "xlsx"  # Excel spreadsheets
    md = "md"      # Markdown
    html = "html"  # HTML documents
    
    # Priority 2: Medium impact
    rtf = "rtf"    # Rich Text Format
    odt = "odt"    # OpenDocument Text
    csv = "csv"    # Comma-separated values
    json = "json"  # JSON data
    
    # Images (OCR only)
    jpg = "jpg"
    jpeg = "jpeg"
    png = "png"
    webp = "webp"
    tiff = "tiff"
    bmp = "bmp"


class DocumentStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    READY = "READY"
    FAILED = "FAILED"


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    uploaded_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(Text, nullable=True)
    file_type = Column(Enum(FileType), nullable=True)
    file_size = Column(Integer, nullable=True)  # bytes
    status = Column(Enum(DocumentStatus), nullable=False, default=DocumentStatus.PENDING)
    progress = Column(Integer, default=0)
    total_chunks = Column(Integer, default=0)
    processing_time_ms = Column(Integer, nullable=True)
    embedding_model = Column(String(100), nullable=True)
    metadata_json = Column(JSON, nullable=True)  # Metadata: images, tables, author, etc.
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    course = relationship("Course", back_populates="documents")
    uploader = relationship("User")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Document(id={self.id}, filename={self.filename}, status={self.status})>"


class DocumentChunk(Base):
    """
    Chunk metadata lưu MySQL. Embedding vector lưu ChromaDB.
    ChromaDB sẽ dùng str(chunk.id) làm ID để đồng bộ.
    """
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    page_number = Column(Integer, nullable=True)
    heading = Column(String(200), nullable=True)
    metadata_json = Column(JSON, nullable=True)  # Extra metadata (flexible)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    document = relationship("Document", back_populates="chunks")
    citations = relationship("Citation", back_populates="chunk")

    def __repr__(self):
        return f"<DocumentChunk(id={self.id}, doc_id={self.document_id}, idx={self.chunk_index})>"
