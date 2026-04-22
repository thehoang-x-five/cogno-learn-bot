/**
 * CopyButton Component
 * 
 * Shows copy button on message hover
 * Position: right for assistant, left for user
 */

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface CopyButtonProps {
  content: string;
  position?: 'left' | 'right';
}

export function CopyButton({ content, position = 'right' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast({
        description: 'Đã sao chép',
        duration: 2000,
      });
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        variant: 'destructive',
        description: 'Không thể sao chép',
      });
    }
  };
  
  const positionClasses = position === 'right' 
    ? 'right-2' 
    : 'left-2';
  
  return (
    <Button
      variant="ghost"
      size="icon"
      className={`absolute top-2 ${positionClasses} opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700`}
      onClick={handleCopy}
      aria-label="Copy message"
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <Copy className="h-4 w-4 text-gray-600 dark:text-gray-400" />
      )}
    </Button>
  );
}
