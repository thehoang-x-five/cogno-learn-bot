"""
Celery Tasks for Document Processing
"""
import logging
import time
from pathlib import Path
from typing import Optional

from celery import Task
from sqlalchemy.orm import Session

from app.celery_app import celery_app
from app.database.db import SessionLocal

# Import ALL models to ensure relationships work
from app.models.document import Document, DocumentChunk, DocumentStatus, FileType
from app.models.subject import Course  # Import Course for relationship
from app.models.user import User  # Import User for relationship
from app.models.chat import Citation  # Import Citation for relationship

from app.services.vector_service import get_vector_service
from app.services.advanced_parser import get_advanced_parser
from app.services.chunking_service import chunk_text, build_chroma_metadata
from app.config import settings
from app.services.app_settings_service import get_effective_rag_config

logger = logging.getLogger(__name__)

# Global embedding model cache (shared across tasks in same worker process)
_embedding_model_cache = None
_embedding_model_name: Optional[str] = None
_embedding_model_lock = None


def _get_embedding_model(db: Session):
    """Get or load embedding model (cached per worker process). Model name from DB or env."""
    global _embedding_model_cache, _embedding_model_name

    try:
        rag = get_effective_rag_config(db)
        model_name = rag.get("embedding_model") or settings.EMBEDDING_MODEL
    except Exception as e:
        logger.warning("Using env embedding model (settings read failed): %s", e)
        model_name = settings.EMBEDDING_MODEL

    if model_name != _embedding_model_name:
        _embedding_model_cache = None
        _embedding_model_name = model_name

    if _embedding_model_cache is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading embedding model: {model_name}")
            _embedding_model_cache = SentenceTransformer(model_name)
            logger.info("✅ Embedding model loaded")
        except Exception as e:
            logger.error(f"Error loading embedding model: {e}")
            raise

    return _embedding_model_cache


class DatabaseTask(Task):
    """Base task with database session"""
    _db: Optional[Session] = None

    @property
    def db(self) -> Session:
        if self._db is None:
            self._db = SessionLocal()
        return self._db

    def after_return(self, *args, **kwargs):
        if self._db is not None:
            self._db.close()
            self._db = None


@celery_app.task(bind=True, base=DatabaseTask, name="process_document")
def process_document_task(self, document_id: int):
    """
    Background task to process uploaded document.
    
    Pipeline:
    1. Parse with Advanced Parser (OCR + images + tables)
    2. Chunk with LlamaIndex
    3. Embed with sentence-transformers
    4. Store in ChromaDB
    """
    db = self.db
    start_time = time.time()
    
    try:
        # Get document
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            logger.error(f"Document {document_id} not found")
            return {"status": "error", "message": "Document not found"}
        
        # Update status to PROCESSING
        document.status = DocumentStatus.PROCESSING
        document.progress = 10
        db.commit()
        
        logger.info(f"🚀 Processing document {document_id}: {document.filename}")
        
        # Get file path
        file_path = Path(document.file_path)
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        # Step 1: Parse document
        logger.info(f"Step 1: Parsing document...")
        document.progress = 20
        db.commit()
        
        raw_text = _parse_document(document, file_path)
        logger.info(f"Step 1 DONE: Parsed text length = {len(raw_text)} chars")
        
        # Special handling for images: allow shorter text or use image description
        is_image = document.file_type in [
            FileType.jpg, FileType.jpeg, FileType.png, 
            FileType.webp, FileType.tiff, FileType.bmp
        ]
        
        if is_image:
            # For images, if OCR text is too short, create a descriptive text
            if not raw_text or len(raw_text.strip()) < 50:
                logger.info(f"Image has little/no OCR text ({len(raw_text.strip())} chars), creating description")
                raw_text = f"""Image: {document.filename}
Filename: {document.filename}
Type: {document.file_type.value}
Course: {document.course.name if document.course else 'Unknown'}

This is an image file that may contain diagrams, charts, illustrations, or visual content.
The image has been processed and stored for reference.

Note: This image contains minimal or no extractable text content from OCR.
"""
        elif not raw_text or len(raw_text.strip()) < 50:
            raise ValueError("Không thể trích xuất nội dung từ file")
        
        # Step 2: Chunk
        logger.info(f"Step 2: Chunking text ({len(raw_text)} chars)...")
        document.progress = 40
        db.commit()
        
        rag = get_effective_rag_config(db)
        logger.info(f"Step 2a: RAG config loaded, chunk_size={rag['chunk_size']}, overlap={rag['chunk_overlap']}")
        import time as _t
        _chunk_start = _t.time()
        chunks_data = chunk_text(
            raw_text,
            document.filename,
            chunk_size=rag["chunk_size"],
            chunk_overlap=rag["chunk_overlap"],
        )
        logger.info(f"Step 2 DONE: {len(chunks_data)} chunks in {_t.time()-_chunk_start:.1f}s")
        
        if not chunks_data:
            raise ValueError("Không thể chia nhỏ văn bản")
        
        # Step 3: Create chunks in database
        logger.info(f"Step 3: Creating {len(chunks_data)} chunks...")
        document.progress = 60
        db.commit()
        
        chunk_records = []
        for idx, chunk_data in enumerate(chunks_data):
            chunk = DocumentChunk(
                document_id=document.id,
                chunk_index=idx,
                content=chunk_data["content"],
                page_number=chunk_data.get("page_number"),
                heading=chunk_data.get("heading"),
                metadata_json=chunk_data.get("metadata")
            )
            db.add(chunk)
            chunk_records.append(chunk)
        
        db.flush()
        
        # Step 4: Generate embeddings
        logger.info(f"Step 4: Generating embeddings for {len(chunk_records)} chunks...")
        document.progress = 80
        db.commit()
        
        texts = [chunk.content for chunk in chunk_records]
        _embed_start = _t.time()
        embeddings = _embed_texts(texts, db)
        logger.info(f"Step 4 DONE: Embeddings generated in {_t.time()-_embed_start:.1f}s")
        
        # Step 5: Store in ChromaDB
        logger.info(f"Step 5: Storing in ChromaDB...")
        document.progress = 90
        db.commit()
        
        vector_service = get_vector_service()
        ids = [str(chunk.id) for chunk in chunk_records]
        metadatas = [build_chroma_metadata(document, chunk) for chunk in chunk_records]
        
        vector_service.add_chunks(
            ids=ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas
        )
        
        # Update document status
        processing_time = int((time.time() - start_time) * 1000)
        document.status = DocumentStatus.READY
        document.total_chunks = len(chunk_records)
        document.progress = 100
        document.processing_time_ms = processing_time
        
        db.commit()
        
        logger.info(f"✅ Document {document_id} processed: {len(chunk_records)} chunks in {processing_time}ms")

        # Notify enrolled students about new document
        try:
            from app.models.subject import Enrollment, EnrollmentRole
            enrolled_ids = [
                e.user_id for e in db.query(Enrollment).filter(
                    Enrollment.course_id == document.course_id,
                    Enrollment.role == EnrollmentRole.student,
                ).all()
            ]
            if enrolled_ids:
                course_name = document.course.name if document.course else f"Môn #{document.course_id}"
                create_notifications.delay(
                    user_ids=enrolled_ids,
                    type="document",
                    title="Tài liệu mới được cập nhật",
                    message=f"Tài liệu '{document.filename}' vừa được thêm vào môn {course_name}",
                    related_type="document",
                    related_id=document.id,
                )
        except Exception as _ne:
            logger.warning(f"Failed to queue document notification: {_ne}")

        return {
            "status": "success",
            "document_id": document_id,
            "chunks": len(chunk_records),
            "processing_time_ms": processing_time
        }
        
    except Exception as e:
        logger.error(f"❌ Error processing document {document_id}: {e}", exc_info=True)
        
        # Update status to FAILED
        document = db.query(Document).filter(Document.id == document_id).first()
        if document:
            document.status = DocumentStatus.FAILED
            document.progress = 0
            db.commit()
        
        return {
            "status": "error",
            "document_id": document_id,
            "message": str(e)
        }


def _parse_document(document: Document, file_path: Path) -> str:
    """Parse document and extract text"""
    import asyncio
    from app.services.advanced_parser import get_advanced_parser
    
    # Simple text files
    if document.file_type == FileType.txt:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except UnicodeDecodeError:
            # Fallback: try other encodings
            for encoding in ['latin-1', 'cp1252', 'iso-8859-1']:
                try:
                    with open(file_path, 'r', encoding=encoding) as f:
                        return f.read()
                except (UnicodeDecodeError, LookupError):
                    continue
            raise ValueError("Không thể đọc file TXT với encoding phù hợp")
    
    # Markdown
    if document.file_type == FileType.md:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    
    # CSV
    if document.file_type == FileType.csv:
        advanced_parser = get_advanced_parser()
        parsed_content = asyncio.run(advanced_parser.parse_csv(file_path))
        return parsed_content.text
    
    # JSON
    if document.file_type == FileType.json:
        advanced_parser = get_advanced_parser()
        parsed_content = asyncio.run(advanced_parser.parse_json(file_path))
        return parsed_content.text
    
    # Advanced parser for complex formats
    advanced_parser = get_advanced_parser()
    
    # Route to appropriate parser
    if document.file_type == FileType.pdf:
        parsed_content = asyncio.run(advanced_parser.parse_pdf(file_path))
    elif document.file_type == FileType.docx:
        parsed_content = asyncio.run(advanced_parser.parse_docx(file_path))
    elif document.file_type == FileType.pptx:
        parsed_content = asyncio.run(advanced_parser.parse_pptx(file_path))
    elif document.file_type == FileType.xlsx:
        parsed_content = asyncio.run(advanced_parser.parse_xlsx(file_path))
    elif document.file_type == FileType.html:
        parsed_content = asyncio.run(advanced_parser.parse_html(file_path))
    elif document.file_type == FileType.rtf:
        parsed_content = asyncio.run(advanced_parser.parse_rtf(file_path))
    elif document.file_type == FileType.odt:
        parsed_content = asyncio.run(advanced_parser.parse_odt(file_path))
    elif document.file_type in [FileType.jpg, FileType.jpeg, FileType.png, 
                                 FileType.webp, FileType.tiff, FileType.bmp]:
        parsed_content = asyncio.run(advanced_parser.parse_image(file_path))
    else:
        raise ValueError(f"Unsupported file type: {document.file_type}")
    
    # Store metadata
    from sqlalchemy.orm import Session
    db = SessionLocal()
    doc = db.query(Document).filter(Document.id == document.id).first()
    if doc:
        doc.metadata_json = {
            "images_count": len(parsed_content.images),
            "tables_count": len(parsed_content.tables),
            "total_pages": parsed_content.total_pages,
            **parsed_content.metadata
        }
        db.commit()
    db.close()
    
    return parsed_content.text


def _chunk_text(text: str, filename: str, chunk_size: int = 1024, chunk_overlap: int = 200) -> list:
    """Backward-compatible wrapper for the page-aware chunking service."""
    return chunk_text(
        text=text,
        filename=filename,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )


def _embed_texts(texts: list, db: Session) -> list:
    """Generate embeddings using cached model"""
    if not texts:
        return []
    
    model = _get_embedding_model(db)
    embeddings = model.encode(
        texts,
        show_progress_bar=False,
        normalize_embeddings=True,
        convert_to_numpy=True
    )
    return embeddings.tolist()


@celery_app.task(name="create_notifications")
def create_notifications(
    user_ids: list,
    type: str,
    title: str,
    message: str,
    related_type: str = None,
    related_id: int = None,
):
    """Bulk-insert in-app notifications for a list of user IDs."""
    # #region agent log
    import json as _json, time as _time
    def _nlog(msg, data, hyp):
        try:
            with open("/app/debug-1b57e8.log", "a") as _f:
                _f.write(_json.dumps({"sessionId":"1b57e8","timestamp":int(_time.time()*1000),"location":"document_tasks.py:create_notifications","message":msg,"data":data,"hypothesisId":hyp}) + "\n")
        except Exception: pass
    _nlog("task_received", {"user_ids": user_ids, "type": type, "related_id": related_id}, "H1")
    # #endregion

    if not user_ids:
        # #region agent log
        _nlog("task_skipped_empty_user_ids", {}, "H1")
        # #endregion
        return

    from app.models.notification import Notification  # local import to avoid circular

    db = SessionLocal()
    try:
        mappings = [
            {
                "user_id": uid,
                "type": type,
                "title": title,
                "message": message,
                "is_read": False,
                "related_type": related_type,
                "related_id": related_id,
            }
            for uid in user_ids
        ]
        db.bulk_insert_mappings(Notification, mappings)
        db.commit()
        logger.info(f"[create_notifications] inserted {len(mappings)} notifications (type={type})")
        # #region agent log
        _nlog("task_success", {"inserted": len(mappings), "type": type}, "H2")
        # #endregion
    except Exception as e:
        logger.error(f"[create_notifications] error: {e}", exc_info=True)
        # #region agent log
        _nlog("task_error", {"error": str(e)}, "H2")
        # #endregion
        db.rollback()
    finally:
        db.close()
