import { mockDocuments } from '@/data/mockData';
import { mockList, mockCreate, mockDelete, delay, type ApiResponse } from './api';
import type { Document, DocumentStatus } from '@/types/document';

let documents = [...mockDocuments];

export const documentService = {
  list: (): Promise<ApiResponse<Document[]>> => mockList(documents),
  create: (doc: Document): Promise<ApiResponse<Document>> => mockCreate(documents, doc),
  delete: (id: string): Promise<ApiResponse<boolean>> => mockDelete(documents, id),
  /** Simulate document processing */
  async processDocument(id: string): Promise<ApiResponse<Document | null>> {
    await delay(3000 + Math.random() * 2000);
    const idx = documents.findIndex((d) => d.id === id);
    if (idx === -1) return { data: null, success: false, message: 'Not found' };
    documents[idx] = { ...documents[idx], status: 'ready' as DocumentStatus, totalChunks: Math.floor(Math.random() * 60 + 20) };
    return { data: documents[idx], success: true };
  },
  _reset: () => { documents = [...mockDocuments]; },
};
