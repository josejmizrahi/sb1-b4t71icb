import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { PointsDisplay } from '../points/PointsDisplay';
import { ThemeToggle } from '../ui/theme-toggle';
import { NotificationBadge } from '../notifications/NotificationBadge';
import { useAuth } from '@/lib/auth/AuthContext';
import { Container } from '../layout/Container';

export function Header() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <Link 
            to="/" 
            className="text-lg font-semibold transition-colors hover:text-primary"
          >
            JNS
          </Link>

          {user && (
            <div className="flex items-center gap-2 md:gap-4">
              <PointsDisplay />
              <ThemeToggle />
              <NotificationBadge />
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-full"
                asChild
              >
                <Link to="/profile">
                  {user.email?.split('@')[0]}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </Container>
    </header>
  );
}