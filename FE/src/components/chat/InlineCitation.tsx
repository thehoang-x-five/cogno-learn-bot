/**
 * InlineCitation Component
 * 
 * Renders numbered citation [1] with hover tooltip showing source details
 */

import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { FileText } from 'lucide-react';
import { ParsedCitation } from '@/utils/citationParser';
import { formatRelevance, getRelevanceColor, truncateText } from '@/utils/citationParser';

interface InlineCitationProps {
  citation: ParsedCitation;
  onClick?: () => void;
}

function hasValidPageNumber(pageNumber?: number | null): pageNumber is number {
  return typeof pageNumber === 'number' && pageNumber > 0;
}

export function InlineCitation({ citation }: InlineCitationProps) {
  const { citationData, documentTitle, pageNumber, pageNumbers } = citation;
  const validPageNumbers = pageNumbers?.filter(hasValidPageNumber);
  
  // Format page display: single page or range
  const pageDisplay = validPageNumbers && validPageNumbers.length > 1
    ? validPageNumbers.length === 2
      ? `${validPageNumbers[0]}, ${validPageNumbers[1]}`
      : `${validPageNumbers[0]}-${validPageNumbers[validPageNumbers.length - 1]}`
    : hasValidPageNumber(pageNumber) ? pageNumber : null;
  
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span
          className="inline-flex items-center justify-center w-5 h-5 text-xs font-normal text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 rounded hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-default mx-0.5"
          aria-label={`Citation ${citation.index}`}
        >
          {citation.index}
        </span>
      </HoverCardTrigger>
      
      <HoverCardContent 
        className="w-96 p-4" 
        side="top"
        align="start"
      >
        <div className="space-y-3">
          {/* Document title */}
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
                {citationData?.document_title || documentTitle}
              </span>
            </div>
          </div>
          
          {/* Page number(s) */}
          {pageDisplay !== null && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span>📍 Trang {pageDisplay}</span>
            </div>
          )}
          
          {/* Quote */}
          {citationData?.quote && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <span className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">
                  "{truncateText(citationData.quote, 200)}"
                </span>
              </div>
            </>
          )}
          
          {/* Relevance score */}
          {citationData?.relevance_score !== undefined && citationData?.relevance_score !== null && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600 dark:text-gray-400">🎯 Độ liên quan:</span>
              <span className={`font-medium ${getRelevanceColor(citationData.relevance_score)}`}>
                {formatRelevance(citationData.relevance_score)}
              </span>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
