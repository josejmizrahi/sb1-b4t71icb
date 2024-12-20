import { Link, useLocation } from 'react-router-dom';
import { ScrollText, Home, Calendar, Trophy, BookOpen, MessageSquare, Scale, Settings, LogOut, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '../ui/use-toast';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { Badge } from '../ui/badge';

const NAV_ITEMS = [
  { path: '/', icon: Home, label: 'Dashboard' },
  { path: '/community', icon: Users, label: 'Community' },
  { path: '/study-groups', icon: BookOpen, label: 'Study Groups' },
  { path: '/events', icon: Calendar, label: 'Events' },
  { path: '/messages', icon: MessageSquare, label: 'Messages' },
  { path: '/governance', icon: Scale, label: 'Governance' },
  { path: '/achievements', icon: Trophy, label: 'Achievements' },
];

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { unreadCount } = useUnreadMessages();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out",
        description: "You have been successfully signed out"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive"
      });
    }
  };

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border fixed left-0 top-16 bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {NAV_ITEMS.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                location.pathname === path
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <div className="flex items-center">
                <Icon className="h-4 w-4 mr-3" />
                <span>{label}</span>
              </div>
              {label === 'Messages' && unreadCount > 0 && (
                <Badge variant="default" className="h-5 min-w-[1.25rem] px-1">
                  {unreadCount}
                </Badge>
              )}
            </Link>
          ))}
        </div>
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3 px-3 py-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.email}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full" asChild>
            <Link to="/settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-destructive hover:text-destructive mt-2"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}