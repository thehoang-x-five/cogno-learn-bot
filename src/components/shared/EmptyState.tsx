import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
}

export default function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 animate-fade-in', className)}>
      <div className="relative mb-6">
        <div className="h-20 w-20 rounded-2xl bg-muted/80 flex items-center justify-center">
          <Icon className="h-9 w-9 text-muted-foreground/40" />
        </div>
        <div className="absolute -inset-3 rounded-3xl border-2 border-dashed border-muted-foreground/10" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm text-center leading-relaxed">{description}</p>}
      {action && (
        <Button onClick={action.onClick} className="mt-5 gap-2" variant="outline">
          {action.icon && <action.icon className="h-4 w-4" />}
          {action.label}
        </Button>
      )}
    </div>
  );
}
