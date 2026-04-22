/**
 * CollapsibleCitations Component
 * 
 * Popover showing list of citations
 * Shows: "📚 Tài liệu tham khảo (3)"
 */

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FileText } from 'lucide-react';
import { Citation } from '@/utils/citationParser';
import { formatRelevance, getRelevanceColor } from '@/utils/citationParser';

interface CollapsibleCitationsProps {
  citations: Citation[];
  onCitationClick?: (index: number) => void;
}

function hasValidPageNumber(pageNumber?: number | null): pageNumber is number {
  return typeof pageNumber === 'number' && pageNumber > 0;
}

export function CollapsibleCitations({ citations, onCitationClick }: CollapsibleCitationsProps) {
  if (!citations || citations.length === 0) {
    return null;
  }
  
  return (
    <div className="mt-3">
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
            <FileText className="w-3 h-3" />
            <span>Tài liệu tham khảo ({citations.length})</span>
          </button>
        </PopoverTrigger>
        
        <PopoverContent 
          className="w-80 p-3" 
          side="top"
          align="start"
        >
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Tài liệu tham khảo ({citations.length})
            </p>
            {citations.map((citation, index) => (
              <button
                key={index}
                onClick={() => onCitationClick?.(index + 1)}
                className="flex items-start gap-2 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors w-full text-left group"
              >
                {/* Citation number */}
                <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">
                  {index + 1}
                </div>
                
                {/* Citation info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {citation.document_title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                    {hasValidPageNumber(citation.page_number) && (
                      <span>Trang {citation.page_number}</span>
                    )}
                    {citation.relevance_score !== undefined && citation.relevance_score !== null && (
                      <span className={getRelevanceColor(citation.relevance_score)}>
                        {formatRelevance(citation.relevance_score)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
