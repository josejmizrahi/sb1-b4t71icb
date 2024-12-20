import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { 
  Settings, 
  User, 
  Bell, 
  Trophy,
  HelpCircle,
  LogOut 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const MENU_ITEMS = [
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: Bell, label: 'Notifications', path: '/notifications' },
  { icon: Trophy, label: 'Achievements', path: '/achievements' },
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: HelpCircle, label: 'Help & Support', path: '/help' },
];

export default function MenuPage() {
  const { user } = useAuth();
  const { toast } = useToast();

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
    <Container size="sm" className="py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-medium">Menu</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your account and preferences
          </p>
        </div>

        <div className="space-y-2">
          {MENU_ITEMS.map(({ icon: Icon, label, path }) => (
            <Link
              key={path}
              to={path}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent"
            >
              <Icon className="h-5 w-5 text-muted-foreground" />
              <span>{label}</span>
            </Link>
          ))}
        </div>

        <div className="pt-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleSignOut}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </div>
    </Container>
  );
}