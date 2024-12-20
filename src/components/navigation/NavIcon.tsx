import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavIconProps {
  icon: LucideIcon;
  isActive?: boolean;
  hasNotification?: boolean;
  notificationCount?: number;
}

export function NavIcon({ 
  icon: Icon, 
  isActive, 
  hasNotification,
  notificationCount 
}: NavIconProps) {
  return (
    <div className="relative inline-flex">
      <Icon 
        className={cn(
          "h-6 w-6",
          isActive ? "text-primary" : "text-muted-foreground"
        )} 
      />
      {hasNotification && (
        <span className={cn(
          "absolute -top-0.5 -right-0.5 flex h-2 w-2",
          notificationCount ? "h-3.5 w-3.5 items-center justify-center" : ""
        )}>
          {notificationCount ? (
            <span className="absolute inline-flex h-full w-full items-center justify-center rounded-full bg-primary text-[8px] font-medium text-primary-foreground">
              {notificationCount > 99 ? '99+' : notificationCount}
            </span>
          ) : (
            <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-primary opacity-75" />
          )}
        </span>
      )}
    </div>
  );
}