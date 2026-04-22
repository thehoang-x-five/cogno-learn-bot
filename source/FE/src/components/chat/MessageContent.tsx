/**
 * MessageContent Component
 * 
 * Renders message content with inline citations parsed and replaced with numbered references.
 * Supports LaTeX/math rendering via KaTeX.
 */

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { InlineCitation } from './InlineCitation';
import { Citation, parseCitations, ParsedCitation } from '@/utils/citationParser';

interface MessageContentProps {
  content: string;
  citations?: Citation[];
  onCitationClick?: (citation: ParsedCitation) => void;
}

/**
 * Normalize LaTeX delimiters so remark-math can parse them.
 * Handles: \( ... \) → $...$  and  \[ ... \] → $$...$$
 * Also fixes common LLM output issues like unbalanced delimiters.
 */
function normalizeLatex(text: string): string {
  // Convert \( ... \) to $ ... $ (inline math)
  let result = text.replace(/\\\((.+?)\\\)/g, (_, expr) => `$${expr}$`);
  // Convert \[ ... \] to $$ ... $$ (display math)
  result = result.replace(/\\\[(.+?)\\\]/gs, (_, expr) => `$$${expr}$$`);
  return result;
}

export function MessageContent({ content, citations = [], onCitationClick }: MessageContentProps) {
  // Parse citations and get map
  const { parsedContent, citationMap } = useMemo(() => {
    return parseCitations(content, citations);
  }, [content, citations]);
  
  // Normalize LaTeX delimiters
  const normalizedContent = useMemo(() => normalizeLatex(parsedContent), [parsedContent]);
  
  // Custom renderer for markdown that handles inline citations
  const components = useMemo(() => ({
    // Handle text nodes to insert citation components
    p: ({ children, ...props }: any) => {
      const processedChildren = processTextWithCitations(children, citationMap, onCitationClick);
      return <div className="mb-4 last:mb-0" {...props}>{processedChildren}</div>;
    },
    li: ({ children, ...props }: any) => {
      const processedChildren = processTextWithCitations(children, citationMap, onCitationClick);
      return <li {...props}>{processedChildren}</li>;
    },
    // Keep other markdown elements as default
  }), [citationMap, onCitationClick]);
  
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Process text content and replace [1], [2] with InlineCitation components
 */
function processTextWithCitations(
  children: any,
  citationMap: Map<number, ParsedCitation>,
  onCitationClick?: (citation: ParsedCitation) => void
): any {
  if (!children) return children;
  
  // If children is array, process each element
  if (Array.isArray(children)) {
    return children.map((child) => 
      processTextWithCitations(child, citationMap, onCitationClick)
    );
  }
  
  // If not string, return as is
  if (typeof children !== 'string') {
    return children;
  }
  
  // Pattern to match [1], [2], etc.
  const citationPattern = /\[(\d+)\]/g;
  const parts: any[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  
  while ((match = citationPattern.exec(children)) !== null) {
    const citationNum = parseInt(match[1], 10);
    const citation = citationMap.get(citationNum);
    
    // Add text before citation
    if (match.index > lastIndex) {
      parts.push(children.substring(lastIndex, match.index));
    }
    
    // Add citation component
    if (citation) {
      parts.push(
        <InlineCitation
          key={`citation-${citationNum}-${match.index}`}
          citation={citation}
          onClick={() => onCitationClick?.(citation)}
        />
      );
    } else {
      // If citation not found in map, keep original text
      parts.push(match[0]);
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < children.length) {
    parts.push(children.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : children;
}
