export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
export type FileType = 'pdf' | 'docx' | 'txt';

export interface Document {
  id: number;
  course_id: number;
  uploaded_by?: number;
  filename: string;
  file_path?: string;
  file_type?: FileType;
  file_size?: number;
  status: DocumentStatus;
  progress: number;
  total_chunks: number;
  processing_time_ms?: number;
  embedding_model?: string;
  created_at: string;
  course_name?: string;
  uploader_name?: string;
  /** When set by API, overrides role-based delete in the UI */
  can_delete?: boolean;
}

export interface DocumentChunk {
  id: number;
  chunk_index: number;
  content: string;
  page_number?: number;
  heading?: string;
}

export interface DocumentDetail extends Document {
  chunks: DocumentChunk[];
}
