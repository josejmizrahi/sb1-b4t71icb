import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button } from '../ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { Badge } from '../ui/badge';

export function NotificationBadge() {
  const { unreadCount } = useNotifications();

  return (
    <Button variant="ghost" size="icon" className="relative rounded-full" asChild>
      <Link to="/notifications">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge 
            variant="default" 
            className="absolute -top-1 -right-1 h-4 min-w-[1rem] px-1"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Link>
    </Button>
  );
}