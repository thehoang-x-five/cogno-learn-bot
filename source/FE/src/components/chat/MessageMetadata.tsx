/**
 * MessageMetadata Component
 * 
 * Displays message metadata: model, tokens, time
 * Format: "gemini-2.5-flash • 26 tokens • 2.5s"
 */

import { formatTime } from '@/utils/citationParser';

interface MessageMetadataProps {
  model?: string;
  tokensUsed?: number;
  totalTimeMs?: number;
  provider?: string;
}

export function MessageMetadata({ 
  model, 
  tokensUsed, 
  totalTimeMs,
  provider 
}: MessageMetadataProps) {
  // Don't render if no data
  if (!model && !tokensUsed && !totalTimeMs) {
    return null;
  }
  
  const parts: string[] = [];
  
  // Model name
  if (model) {
    parts.push(model);
  }
  
  // Tokens
  if (tokensUsed) {
    parts.push(`${tokensUsed} tokens`);
  }
  
  // Time
  if (totalTimeMs) {
    parts.push(formatTime(totalTimeMs));
  }
  
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-2">
      {parts.map((part, index) => (
        <span key={index} className="flex items-center gap-1.5">
          {index > 0 && <span>•</span>}
          <span>{part}</span>
        </span>
      ))}
    </div>
  );
}
