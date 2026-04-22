/**
 * CitationModal Component
 *
 * Shows the source document and retrieved chunks for a clicked citation.
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Hash, Quote, Target } from 'lucide-react';
import { Citation, ParsedCitation } from '@/utils/citationParser';
import { formatRelevance, getRelevanceColor } from '@/utils/citationParser';

interface CitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  citation: ParsedCitation | null;
  allCitations: Citation[];
}

function hasValidPageNumber(pageNumber?: number | null): pageNumber is number {
  return typeof pageNumber === 'number' && pageNumber > 0;
}

function cleanQuote(quote?: string | null): string {
  if (!quote) return '';
  return quote
    .replace(/^\s*>\s?/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function CitationModal({ isOpen, onClose, citation, allCitations }: CitationModalProps) {
  if (!citation) return null;

  const documentTitle = citation.citationData?.document_title || citation.documentTitle;
  const relatedChunks = allCitations
    .filter((item) => item.document_title === documentTitle)
    .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));

  const selectedPage = hasValidPageNumber(citation.citationData?.page_number)
    ? citation.citationData.page_number
    : hasValidPageNumber(citation.pageNumber)
      ? citation.pageNumber
      : null;

  const bestRelevance = relatedChunks.find((chunk) => chunk.relevance_score !== undefined && chunk.relevance_score !== null)?.relevance_score;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[84vh] overflow-hidden border-slate-800 bg-slate-950 p-0 text-slate-100 shadow-2xl">
        <DialogHeader className="border-b border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950/40 px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-400/30 bg-blue-500/10 text-blue-300">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.22em] text-blue-300/80">
                Nguồn [{citation.index}]
              </p>
              <DialogTitle className="break-words text-xl font-semibold leading-snug text-slate-50">
                {documentTitle}
              </DialogTitle>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-slate-300">
                  <Quote className="h-3.5 w-3.5" />
                  {relatedChunks.length} đoạn trích
                </span>
                {selectedPage && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-slate-300">
                    <Hash className="h-3.5 w-3.5" />
                    Trang {selectedPage}
                  </span>
                )}
                {bestRelevance !== undefined && bestRelevance !== null && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-300">
                    <Target className="h-3.5 w-3.5" />
                    Liên quan {formatRelevance(bestRelevance)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(84vh-150px)]">
          <div className="space-y-4 bg-slate-950 px-6 py-5">
            {relatedChunks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center text-sm text-slate-400">
                Không tìm thấy đoạn trích nào cho nguồn này.
              </div>
            ) : (
              relatedChunks.map((chunk, index) => {
                const quote = cleanQuote(chunk.quote);
                return (
                  <article
                    key={`${chunk.chunk_id || index}-${chunk.page_number || 'no-page'}`}
                    className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-xs font-semibold text-blue-300">
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium text-slate-200">
                          Đoạn trích {index + 1}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {hasValidPageNumber(chunk.page_number) && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-2.5 py-1 text-slate-300">
                            <Hash className="h-3.5 w-3.5" />
                            Trang {chunk.page_number}
                          </span>
                        )}
                        {chunk.relevance_score !== undefined && chunk.relevance_score !== null && (
                          <span className={`inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-2.5 py-1 ${getRelevanceColor(chunk.relevance_score)}`}>
                            <Target className="h-3.5 w-3.5" />
                            {formatRelevance(chunk.relevance_score)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-4">
                      {quote ? (
                        <div className="prose prose-sm max-w-none rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 leading-relaxed prose-p:my-2 prose-strong:text-slate-100 prose-code:text-blue-200 dark:prose-invert">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {quote}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="rounded-xl border border-dashed border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-500">
                          Đoạn trích này không có nội dung xem trước.
                        </p>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
