import { Link, useLocation } from 'react-router-dom';
import { Home, Users, PlusCircle, MessageSquare, Menu } from 'lucide-react';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { NavIcon } from './NavIcon';

const NAV_ITEMS = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/community', icon: Users, label: 'Community' },
  { path: '/create', icon: PlusCircle, label: 'Create' },
  { path: '/messages', icon: MessageSquare, label: 'Messages' },
  { path: '/menu', icon: Menu, label: 'Menu' },
];

export function MobileNav() {
  const location = useLocation();
  const { unreadCount } = useUnreadMessages();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-background/80 backdrop-blur-lg border-t">
        <div className="grid h-12 grid-cols-5">
          {NAV_ITEMS.map(({ path, icon, label }) => (
            <Link
              key={path}
              to={path}
              className="flex items-center justify-center"
              aria-label={label}
            >
              <NavIcon
                icon={icon}
                isActive={location.pathname === path}
                hasNotification={label === 'Messages' && unreadCount > 0}
                notificationCount={label === 'Messages' ? unreadCount : undefined}
              />
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}