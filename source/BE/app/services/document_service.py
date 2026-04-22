import logging
import os
import time
from pathlib import Path
from typing import List, Optional, Tuple

from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.document import Document, DocumentChunk, DocumentStatus, FileType
from app.models.subject import Course, Enrollment, EnrollmentRole
from app.models.user import User
from app.config import settings
from app.services.vector_service import get_vector_service

logger = logging.getLogger(__name__)

# Upload directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Allowed file types - sync with FileType enum
ALLOWED_EXTENSIONS = {
    # Original types
    ".pdf", ".docx", ".txt",
    # Priority 1: High impact
    ".pptx", ".xlsx", ".md", ".html",
    # Priority 2: Medium impact
    ".rtf", ".odt", ".csv", ".json",
    # Images (OCR only)
    ".jpg", ".jpeg", ".png", ".webp", ".tiff", ".bmp"
}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


def _queue_document_processing(document_id: int):
    """Queue document for background processing (lazy import to avoid circular)"""
    try:
        from app.celery_app import celery_app
        task = celery_app.send_task('process_document', args=[document_id])
        return task
    except Exception as e:
        logger.error(f"Error queuing task: {e}")
        raise


class DocumentService:
    """
    Service for document upload and management.

    Upload flow:
      1. Validate & save file to disk
      2. Create DB record (status=PENDING)
      3. Queue for background processing via Celery

    Actual processing pipeline (OCR → Chunk → Embed → VectorDB)
    runs in Celery worker — see app/tasks/document_tasks.py
    """

    def __init__(self):
        self.vector_service = get_vector_service()

    async def upload_document(
        self,
        db: Session,
        file: UploadFile,
        course_id: int,
        user: User
    ) -> Document:
        """
        Upload document và queue cho background processing.
        Trả về ngay lập tức, không chờ xử lý xong.
        """
        # Validate course exists
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Không tìm thấy môn học")

        # Check permission: admin or teacher of this course
        if user.role.value != "admin":
            enrollment = db.query(Enrollment).filter(
                Enrollment.user_id == user.id,
                Enrollment.course_id == course_id,
                Enrollment.role == EnrollmentRole.teacher
            ).first()
            if not enrollment:
                raise HTTPException(
                    status_code=403,
                    detail="Chỉ admin hoặc giáo viên của môn học mới có thể upload tài liệu"
                )

        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="Tên file không hợp lệ")

        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Định dạng file không được hỗ trợ. Chỉ chấp nhận: {', '.join(ALLOWED_EXTENSIONS)}"
            )

        # Read file content
        content = await file.read()
        file_size = len(content)

        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File quá lớn. Tối đa {MAX_FILE_SIZE // (1024*1024)}MB"
            )

        # Save file to disk
        timestamp = int(time.time())
        safe_filename = f"{course_id}_{timestamp}_{file.filename}"
        file_path = UPLOAD_DIR / safe_filename

        with open(file_path, "wb") as f:
            f.write(content)

        # Create document record
        # Map file extension to FileType enum
        file_type_map = {
            ".pdf": FileType.pdf,
            ".docx": FileType.docx,
            ".txt": FileType.txt,
            ".pptx": FileType.pptx,
            ".xlsx": FileType.xlsx,
            ".md": FileType.md,
            ".html": FileType.html,
            ".rtf": FileType.rtf,
            ".odt": FileType.odt,
            ".csv": FileType.csv,
            ".json": FileType.json,
            ".jpg": FileType.jpg,
            ".jpeg": FileType.jpeg,
            ".png": FileType.png,
            ".webp": FileType.webp,
            ".tiff": FileType.tiff,
            ".bmp": FileType.bmp,
        }
        document = Document(
            course_id=course_id,
            uploaded_by=user.id,
            filename=file.filename,
            file_path=str(file_path),
            file_type=file_type_map.get(file_ext),
            file_size=file_size,
            status=DocumentStatus.PENDING,  # Start as PENDING
            embedding_model=settings.EMBEDDING_MODEL
        )
        db.add(document)
        db.commit()
        db.refresh(document)

        # Queue for background processing
        try:
            task = _queue_document_processing(document.id)
            logger.info(f"✅ Document {document.id} queued for processing. Task ID: {task.id}")
        except Exception as e:
            logger.error(f"❌ Error queuing document {document.id}: {e}")
            # If queue fails, mark as failed
            document.status = DocumentStatus.FAILED
            db.commit()
            raise HTTPException(
                status_code=500,
                detail=f"Lỗi queue xử lý tài liệu: {str(e)}"
            )

        return document

    def get_documents(
        self,
        db: Session,
        course_id: Optional[int] = None,
        user_id: Optional[int] = None,
        status: Optional[DocumentStatus] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[Document], int]:
        """
        Get documents with filters.
        
        If user_id is provided (non-admin):
        - Get documents from courses where user is enrolled (teacher or student)
        - Not just documents uploaded by that user
        """
        query = db.query(Document)

        if course_id:
            query = query.filter(Document.course_id == course_id)
        elif user_id:
            # Get all courses where user is enrolled
            enrolled_course_ids = db.query(Enrollment.course_id).filter(
                Enrollment.user_id == user_id
            ).distinct().all()
            enrolled_course_ids = [c[0] for c in enrolled_course_ids]
            
            if enrolled_course_ids:
                query = query.filter(Document.course_id.in_(enrolled_course_ids))
            else:
                # User not enrolled in any course, return empty
                return [], 0
                
        if status:
            query = query.filter(Document.status == status)

        total = query.count()
        documents = query.order_by(desc(Document.created_at)).offset(skip).limit(limit).all()

        return documents, total

    def get_document_by_id(self, db: Session, document_id: int) -> Optional[Document]:
        """Get document by ID with relationships"""
        return db.query(Document).filter(Document.id == document_id).first()

    def delete_document(self, db: Session, document_id: int, user: User) -> bool:
        """Delete document and its chunks"""
        document = self.get_document_by_id(db, document_id)
        if not document:
            return False

        # Check permission
        if user.role.value != "admin" and document.uploaded_by != user.id:
            raise HTTPException(status_code=403, detail="Không có quyền xóa tài liệu này")

        # Delete from vector database
        try:
            self.vector_service.delete_by_document(document_id)
        except Exception as e:
            logger.warning(f"Error deleting vectors: {e}")

        # Delete file from disk
        if document.file_path and os.path.exists(document.file_path):
            try:
                os.remove(document.file_path)
            except Exception as e:
                logger.warning(f"Error deleting file: {e}")

        # Delete from database (cascades to chunks)
        db.delete(document)
        db.commit()

        return True


# Singleton instance
_service_instance = None


def get_document_service() -> DocumentService:
    global _service_instance
    if _service_instance is None:
        _service_instance = DocumentService()
    return _service_instance
