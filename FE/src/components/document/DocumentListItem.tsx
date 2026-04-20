import { FileText, Trash2, Eye, Clock, CheckCircle, XCircle, Loader2, Download, FileSpreadsheet, Presentation, FileCode, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import type { Document } from '@/types/document';
import { parseBackendDate } from '@/utils/dateUtils';

interface DocumentListItemProps {
  document: Document;
  canDelete?: boolean;
  onView?: (document: Document) => void;
  onDelete?: (document: Document) => void;
  onDownload?: (document: Document) => void;
}

export default function DocumentListItem({
  document,
  canDelete = false,
  onView,
  onDelete,
  onDownload,
}: DocumentListItemProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'READY':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'PROCESSING':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      READY: 'default',
      PROCESSING: 'secondary',
      FAILED: 'destructive',
      PENDING: 'outline',
    };

    const labels: Record<string, string> = {
      READY: 'Sẵn sàng',
      PROCESSING: 'Đang xử lý',
      FAILED: 'Lỗi',
      PENDING: 'Chờ xử lý',
    };

    return (
      <Badge variant={variants[status] || 'outline'} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {labels[status] || status}
      </Badge>
    );
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return parseBackendDate(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileIcon = (fileType?: string) => {
    if (!fileType) return <FileText className="h-8 w-8" />;

    const type = fileType.toLowerCase();

    // Spreadsheets - Green
    if (['xlsx', 'xls', 'csv'].includes(type)) {
      return <FileSpreadsheet className="h-8 w-8 text-green-600" />;
    }

    // Presentations - Orange
    if (['pptx', 'ppt'].includes(type)) {
      return <Presentation className="h-8 w-8 text-orange-600" />;
    }

    // Code/Markup - Purple
    if (['md', 'html', 'json', 'xml'].includes(type)) {
      return <FileCode className="h-8 w-8 text-purple-600" />;
    }

    // Images - Pink
    if (['jpg', 'jpeg', 'png', 'webp', 'tiff', 'bmp', 'gif'].includes(type)) {
      return <Image className="h-8 w-8 text-pink-600" />;
    }

    // Documents - Blue (PDF, DOCX, TXT, RTF, ODT)
    if (['pdf', 'docx', 'doc', 'txt', 'rtf', 'odt'].includes(type)) {
      return <FileText className="h-8 w-8 text-blue-600" />;
    }

    // Default
    return <FileText className="h-8 w-8 text-gray-400" />;
  };

  const handleViewInBrowser = () => {
    // Get token from localStorage
    const token = localStorage.getItem('access_token');
    if (!token) {
      alert('Vui lòng đăng nhập lại');
      return;
    }
    
    // Open document in new tab with token in URL
    const viewUrl = `${import.meta.env.VITE_API_URL}/api/documents/${document.id}/view?token=${token}`;
    window.open(viewUrl, '_blank');
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary transition-colors">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* File Icon */}
        <div className="flex-shrink-0">
          {getFileIcon(document.file_type)}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {/* Clickable filename to view in browser for all users when READY */}
            {document.status === 'READY' ? (
              <button
                onClick={handleViewInBrowser}
                className="font-medium truncate hover:text-primary hover:underline text-left"
              >
                {document.filename}
              </button>
            ) : (
              <p className="font-medium truncate">{document.filename}</p>
            )}
            {document.file_type && (
              <Badge variant="outline" className="text-xs">
                {document.file_type.toUpperCase()}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500">
            {document.uploader_name && (
              <span className="flex items-center gap-1">
                <span>👤</span>
                {document.uploader_name}
              </span>
            )}
            <span>•</span>
            <span>{formatDate(document.created_at)}</span>
            {document.total_chunks > 0 && (
              <>
                <span>•</span>
                <span>{document.total_chunks} chunks</span>
              </>
            )}
            {document.file_size && (
              <>
                <span>•</span>
                <span>{formatFileSize(document.file_size)}</span>
              </>
            )}
          </div>

          {/* Processing Progress */}
          {document.status === 'PROCESSING' && document.progress > 0 && (
            <div className="mt-2">
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all"
                  style={{ width: `${document.progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Đang xử lý... {document.progress}%
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Status & Actions */}
      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
        {getStatusBadge(document.status)}

        <div className="flex items-center gap-1">
          {onDownload && document.status === 'READY' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDownload(document)}
              title="Tải xuống"
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}

          {/* Admin only: View chunks */}
          {isAdmin && onView && document.status === 'READY' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onView(document)}
              title="Xem chunks (Admin)"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}

          {canDelete && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(document)}
              title="Xóa"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
