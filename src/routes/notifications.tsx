import { Container } from '@/components/layout/Container';
import { PageHeader } from '@/components/ui/page-header';
import { NotificationList } from '@/components/notifications/NotificationList';

export default function NotificationsPage() {
  return (
    <Container size="sm" className="py-8">
      <PageHeader 
        title="Notifications" 
        description="Stay updated with your latest activities"
      />

      <div className="mt-6">
        <NotificationList />
      </div>
    </Container>
  );
}