import { useEffect } from 'react';
import { format } from 'date-fns';
import { Bell, MessageSquare, Trophy, Calendar, Scale } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { LoadingSpinner } from '../ui/loading-spinner';
import { EmptyState } from '../ui/empty-state';
import type { NotificationType } from '@/types/notifications';

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'message':
      return MessageSquare;
    case 'achievement':
      return Trophy;
    case 'event':
      return Calendar;
    case 'governance':
      return Scale;
    default:
      return Bell;
  }
};

export function NotificationList() {
  const { 
    notifications, 
    loading, 
    error,
    markAsRead,
    markAllAsRead 
  } = useNotifications();

  useEffect(() => {
    const unreadNotifications = notifications.filter(n => !n.read);
    if (unreadNotifications.length > 0) {
      unreadNotifications.forEach(n => markAsRead(n.id));
    }
  }, [notifications]);

  if (loading) return <LoadingSpinner />;
  if (error) return <div>Error: {error.message}</div>;
  if (!notifications.length) {
    return (
      <EmptyState
        icon={Bell}
        title="No notifications"
        description="You're all caught up!"
      />
    );
  }

  return (
    <div className="space-y-4">
      {notifications.length > 0 && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            Mark all as read
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {notifications.map((notification) => {
          const Icon = getNotificationIcon(notification.type);

          return (
            <Card 
              key={notification.id}
              className={notification.read ? 'opacity-60' : ''}
            >
              <CardContent className="flex items-start gap-4 p-4">
                <div className={`
                  rounded-full p-2 
                  ${notification.read ? 'bg-muted' : 'bg-primary/10'}
                `}>
                  <Icon className={`h-4 w-4 ${
                    notification.read ? 'text-muted-foreground' : 'text-primary'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{notification.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {notification.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {format(new Date(notification.created_at), 'PPp')}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}