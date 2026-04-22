import { useEffect, useState } from 'react';
import { FileText, Clock, Package } from 'lucide-react';
import { parseBackendDate } from '@/utils/dateUtils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { documentService } from '@/services/documentService';
import type { DocumentDetail } from '@/types/document';

interface DocumentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: number;
}

export default function DocumentDetailDialog({
  open,
  onOpenChange,
  documentId,
}: DocumentDetailDialogProps) {
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && documentId) {
      loadDocumentDetail();
    }
  }, [open, documentId]);

  const loadDocumentDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await documentService.getDetail(documentId);
      setDocument(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Không thể tải chi tiết tài liệu');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return parseBackendDate(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Chi tiết tài liệu (Admin)
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && document && (
          <div className="space-y-6 overflow-auto pr-2">
            {/* Document Info */}
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-lg">{document.filename}</h3>
                <p className="text-sm text-gray-500">
                  {document.course_name && `Môn học: ${document.course_name}`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Người upload</p>
                  <p className="font-medium">{document.uploader_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Ngày upload</p>
                  <p className="font-medium">{formatDate(document.created_at)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Kích thước</p>
                  <p className="font-medium">{formatFileSize(document.file_size)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Loại file</p>
                  <p className="font-medium">{document.file_type?.toUpperCase() || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Trạng thái</p>
                  <Badge variant={document.status === 'READY' ? 'default' : 'secondary'}>
                    {document.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-gray-500">Số chunks</p>
                  <p className="font-medium flex items-center gap-1">
                    <Package className="h-4 w-4" />
                    {document.total_chunks}
                  </p>
                </div>
              </div>

              {document.processing_time_ms && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>
                    Thời gian xử lý: {(document.processing_time_ms / 1000).toFixed(2)}s
                  </span>
                </div>
              )}

              {document.embedding_model && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Embedding model:</span> {document.embedding_model}
                </div>
              )}
            </div>

            {/* Chunks */}
            {document.chunks && document.chunks.length > 0 && (
              <div className="max-w-full overflow-hidden">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Chunks ({document.chunks.length})
                </h4>
                <ScrollArea className="h-[400px] border rounded-lg bg-muted/20 overflow-x-hidden">
                  <div className="p-4 space-y-3 max-w-full">
                    {document.chunks.map((chunk) => (
                      <div
                        key={chunk.id}
                        className="border-l-2 border-blue-500 pl-3 py-2 bg-white rounded-r w-full overflow-hidden"
                      >
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            Chunk {chunk.chunk_index + 1}
                          </Badge>
                          {chunk.heading && (
                            <span className="text-xs font-medium text-gray-700 break-words">
                              {chunk.heading}
                            </span>
                          )}
                          {chunk.page_number && (
                            <span className="text-xs text-gray-500">
                              Trang {chunk.page_number}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap break-all max-w-full">
                          {chunk.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
