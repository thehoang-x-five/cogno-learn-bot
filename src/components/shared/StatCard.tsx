import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
  iconColor?: string;
  iconBg?: string;
  className?: string;
}

export default function StatCard({
  title, value, icon: Icon, change, trend = 'up', subtitle,
  iconColor = 'text-primary', iconBg = 'bg-primary/10', className,
}: StatCardProps) {
  return (
    <Card className={cn('group hover-lift overflow-hidden relative', className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-[13px] font-medium text-muted-foreground leading-tight">{title}</p>
          <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110', iconBg)}>
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {(change || subtitle) && (
            <div className="flex items-center gap-1.5">
              {change && (
                <span className={cn(
                  'inline-flex items-center gap-0.5 text-xs font-medium',
                  trend === 'up' ? 'text-accent' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
                )}>
                  {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : trend === 'down' ? <TrendingDown className="h-3 w-3" /> : null}
                  {change}
                </span>
              )}
              {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
            </div>
          )}
        </div>
      </CardContent>
      {/* Subtle gradient accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </Card>
  );
}
