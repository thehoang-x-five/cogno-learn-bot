from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
import logging
import os
from pathlib import Path

from app.database.db import get_db
from app.dependencies.deps import get_current_user, get_current_user_from_token_or_query
from app.models.user import User, UserRole
from app.models.document import DocumentStatus
from app.schemas.document import (
    DocumentUploadResponse,
    DocumentResponse,
    DocumentListResponse,
    DocumentDetailResponse,
    DocumentChunkResponse
)
from app.services.document_service import get_document_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/documents", tags=["Documents"])


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    course_id: int = Query(..., description="ID môn học"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    doc_service = Depends(get_document_service)
):
    """
    Upload tài liệu môn học (chỉ admin hoặc giáo viên).
    
    - Lưu file vào thư mục uploads/
    - Queue cho background processing (không chờ)
    - Trả về ngay lập tức với status PENDING
    - Hỗ trợ: PDF, DOCX, TXT
    """
    try:
        document = await doc_service.upload_document(db, file, course_id, current_user)
        
        return DocumentUploadResponse(
            id=document.id,
            filename=document.filename,
            file_type=document.file_type,
            file_size=document.file_size,
            status=document.status,
            message="Tài liệu đã được queue để xử lý. Vui lòng chờ..."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in upload_document: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi không xác định: {str(e)}"
        )


@router.get("/{document_id}/status")
def get_document_status(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    doc_service = Depends(get_document_service)
):
    """
    Lấy trạng thái xử lý của tài liệu.
    
    - Dùng để polling status từ frontend
    - Trả về: status, progress, total_chunks
    """
    document = doc_service.get_document_by_id(db, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")
    
    return {
        "id": document.id,
        "filename": document.filename,
        "status": document.status,
        "progress": document.progress,
        "total_chunks": document.total_chunks,
        "processing_time_ms": document.processing_time_ms
    }


@router.get("", response_model=DocumentListResponse)
def list_documents(
    course_id: Optional[int] = Query(None, description="Lọc theo môn học"),
    status: Optional[DocumentStatus] = Query(None, description="Lọc theo trạng thái"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    doc_service = Depends(get_document_service)
):
    """
    Lấy danh sách tài liệu.
    
    - Admin: xem tất cả
    - Giáo viên/Sinh viên: xem tài liệu của môn học mình tham gia
    """
    # Admin can see all
    user_id_filter = None if current_user.role == UserRole.admin else current_user.id
    
    documents, total = doc_service.get_documents(
        db,
        course_id=course_id,
        user_id=user_id_filter if not course_id else None,
        status=status,
        skip=skip,
        limit=limit
    )

    # Enrich with course and uploader names
    items = []
    for doc in documents:
        doc_dict = {
            "id": doc.id,
            "course_id": doc.course_id,
            "uploaded_by": doc.uploaded_by,
            "filename": doc.filename,
            "file_path": doc.file_path,
            "file_type": doc.file_type,
            "file_size": doc.file_size,
            "status": doc.status,
            "progress": doc.progress,
            "total_chunks": doc.total_chunks,
            "processing_time_ms": doc.processing_time_ms,
            "embedding_model": doc.embedding_model,
            "created_at": doc.created_at,
            "course_name": doc.course.name if doc.course else None,
            "uploader_name": doc.uploader.full_name if doc.uploader else None
        }
        items.append(DocumentResponse(**doc_dict))

    return DocumentListResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{document_id}", response_model=DocumentDetailResponse)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    doc_service = Depends(get_document_service)
):
    """Lấy chi tiết tài liệu bao gồm danh sách chunks"""
    document = doc_service.get_document_by_id(db, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")

    # Build response with chunks - return full content
    chunks = [
        DocumentChunkResponse(
            id=chunk.id,
            chunk_index=chunk.chunk_index,
            content=chunk.content,  # Return full content, not truncated
            page_number=chunk.page_number,
            heading=chunk.heading
        )
        for chunk in document.chunks
    ]

    return DocumentDetailResponse(
        id=document.id,
        course_id=document.course_id,
        uploaded_by=document.uploaded_by,
        filename=document.filename,
        file_path=document.file_path,
        file_type=document.file_type,
        file_size=document.file_size,
        status=document.status,
        progress=document.progress,
        total_chunks=document.total_chunks,
        processing_time_ms=document.processing_time_ms,
        embedding_model=document.embedding_model,
        created_at=document.created_at,
        course_name=document.course.name if document.course else None,
        uploader_name=document.uploader.full_name if document.uploader else None,
        chunks=chunks
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    doc_service = Depends(get_document_service)
):
    """
    Xóa tài liệu.
    
    - Admin: xóa bất kỳ tài liệu nào
    - Giáo viên: chỉ xóa tài liệu do mình upload
    """
    if not doc_service.delete_document(db, document_id, current_user):
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")


@router.get("/course/{course_id}/stats")
def get_course_document_stats(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    doc_service = Depends(get_document_service)
):
    """Thống kê tài liệu của môn học"""
    documents, total = doc_service.get_documents(db, course_id=course_id, skip=0, limit=1000)
    
    stats = {
        "total_documents": total,
        "by_status": {
            "ready": sum(1 for d in documents if d.status == DocumentStatus.READY),
            "processing": sum(1 for d in documents if d.status == DocumentStatus.PROCESSING),
            "failed": sum(1 for d in documents if d.status == DocumentStatus.FAILED),
            "pending": sum(1 for d in documents if d.status == DocumentStatus.PENDING)
        },
        "total_chunks": sum(d.total_chunks for d in documents),
        "total_size_mb": round(sum(d.file_size or 0 for d in documents) / (1024 * 1024), 2)
    }
    
    return stats


@router.get("/{document_id}/download")
async def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    doc_service = Depends(get_document_service)
):
    """
    Tải xuống file tài liệu gốc.
    
    - Trả về file với tên gốc
    - Hỗ trợ tất cả định dạng: PDF, DOCX, TXT
    """
    document = doc_service.get_document_by_id(db, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")
    
    # Check if file exists
    if not document.file_path or not os.path.exists(document.file_path):
        raise HTTPException(status_code=404, detail="File không tồn tại trên server")
    
    # Determine media type
    media_types = {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "txt": "text/plain"
    }
    media_type = media_types.get(document.file_type.value if document.file_type else "txt", "application/octet-stream")
    
    # Return file
    return FileResponse(
        path=document.file_path,
        media_type=media_type,
        filename=document.filename,
        headers={
            "Content-Disposition": f'attachment; filename="{document.filename}"'
        }
    )


@router.get("/{document_id}/view")
async def view_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_token_or_query),
    doc_service = Depends(get_document_service)
):
    """
    Xem file tài liệu trong browser (inline, không download).
    
    - Dùng cho teacher/student/admin để xem trực tiếp
    - Hỗ trợ: PDF, TXT, images, HTML, MD
    - Token có thể gửi qua header hoặc query parameter
    """
    document = doc_service.get_document_by_id(db, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")
    
    # Check if file exists
    if not document.file_path or not os.path.exists(document.file_path):
        raise HTTPException(status_code=404, detail="File không tồn tại trên server")
    
    # Determine media type
    media_types = {
        "pdf": "application/pdf",
        "txt": "text/plain",
        "html": "text/html",
        "md": "text/markdown",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "webp": "image/webp",
        "tiff": "image/tiff",
        "bmp": "image/bmp",
    }
    media_type = media_types.get(document.file_type.value if document.file_type else "txt", "application/octet-stream")
    
    # Return file with inline disposition (view in browser)
    return FileResponse(
        path=document.file_path,
        media_type=media_type,
        filename=document.filename,
        headers={
            "Content-Disposition": f'inline; filename="{document.filename}"'
        }
    )
