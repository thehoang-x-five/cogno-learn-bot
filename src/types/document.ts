export type DocumentStatus = 'pending' | 'processing' | 'ready' | 'error';
export type FileType = 'pdf' | 'docx' | 'txt';

export interface Document {
  id: string;
  courseId: string;
  uploadedBy: string;
  filename: string;
  filePath: string;
  fileType: FileType;
  fileSize: number;
  status: DocumentStatus;
  totalChunks: number;
  createdAt: string;
}
