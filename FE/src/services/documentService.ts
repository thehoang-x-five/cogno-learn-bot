import apiClient from './apiClient';
import * as authService from './authService';
import type { Document, DocumentDetail, DocumentStatus } from '@/types/document';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * GET binary response with Bearer auth + refresh (same behavior as apiRequest, but returns Blob).
 */
async function fetchBlobWithAuth(endpoint: string): Promise<Blob> {
  const token = authService.getAccessToken();
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

  const buildHeaders = (): HeadersInit => {
    const h: HeadersInit = {};
    if (authService.getAccessToken()) {
      h['Authorization'] = `Bearer ${authService.getAccessToken()}`;
    }
    return h;
  };

  let response = await fetch(url, { method: 'GET', headers: buildHeaders() });

  if (response.status === 401 && token) {
    const refreshed = await authService.refreshAccessToken();
    if (refreshed) {
      response = await fetch(url, { method: 'GET', headers: buildHeaders() });
    } else {
      authService.clearTokens();
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }
  }

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const err = await response.json();
      detail = typeof err.detail === 'string' ? err.detail : err.message || detail;
    } catch {
      /* not JSON */
    }
    throw new Error(detail || `HTTP ${response.status}`);
  }

  return response.blob();
}

export const documentService = {
  /**
   * Upload document to course
   */
  async upload(courseId: number, file: File): Promise<{
    id: number;
    filename: string;
    file_type: string;
    file_size: number;
    status: DocumentStatus;
    message: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<{
      id: number;
      filename: string;
      file_type: string;
      file_size: number;
      status: DocumentStatus;
      message: string;
    }>(`/api/documents/upload?course_id=${courseId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * List documents with filters
   */
  async list(params?: {
    course_id?: number;
    status?: DocumentStatus;
    skip?: number;
    limit?: number;
  }): Promise<{
    items: Document[];
    total: number;
    skip: number;
    limit: number;
  }> {
    const response = await apiClient.get<{
      items: Document[];
      total: number;
      skip: number;
      limit: number;
    }>('/api/documents', { params });
    return response.data;
  },

  /**
   * Get document detail with chunks
   */
  async getDetail(documentId: number): Promise<DocumentDetail> {
    const response = await apiClient.get<DocumentDetail>(`/api/documents/${documentId}`);
    return response.data;
  },

  /**
   * Get document status (for polling)
   */
  async getStatus(documentId: number): Promise<{
    id: number;
    filename: string;
    status: DocumentStatus;
    progress: number;
    total_chunks: number;
    processing_time_ms: number | null;
  }> {
    const response = await apiClient.get<{
      id: number;
      filename: string;
      status: DocumentStatus;
      progress: number;
      total_chunks: number;
      processing_time_ms: number | null;
    }>(`/api/documents/${documentId}/status`);
    return response.data;
  },

  /**
   * Delete document
   */
  async delete(documentId: number): Promise<void> {
    await apiClient.delete(`/api/documents/${documentId}`);
  },

  /**
   * Get course document statistics
   */
  async getCourseStats(courseId: number): Promise<{
    total_documents: number;
    by_status: {
      ready: number;
      processing: number;
      failed: number;
      pending: number;
    };
    total_chunks: number;
    total_size_mb: number;
  }> {
    const response = await apiClient.get<{
      total_documents: number;
      by_status: {
        ready: number;
        processing: number;
        failed: number;
        pending: number;
      };
      total_chunks: number;
      total_size_mb: number;
    }>(`/api/documents/course/${courseId}/stats`);
    return response.data;
  },

  /**
   * Download document file (original bytes from API — not JSON)
   */
  async download(documentId: number, filename: string): Promise<void> {
    const blob = await fetchBlobWithAuth(`/api/documents/${documentId}/download`);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
