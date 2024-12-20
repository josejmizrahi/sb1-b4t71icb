import { Button } from './button';
import { Calendar, Coins, Vote, BookOpen } from 'lucide-react';

interface ActionButtonProps {
  type: 'event' | 'campaign' | 'poll' | 'study-group';
  onClick: () => void;
  disabled?: boolean;
}

export function ActionButton({ type, onClick, disabled }: ActionButtonProps) {
  const config = {
    event: {
      label: 'Join Event',
      icon: Calendar,
      variant: 'default' as const,
    },
    campaign: {
      label: 'Donate Now',
      icon: Coins,
      variant: 'default' as const,
    },
    poll: {
      label: 'Vote Now',
      icon: Vote,
      variant: 'default' as const,
    },
    'study-group': {
      label: 'Join Group',
      icon: BookOpen,
      variant: 'default' as const,
    },
  };

  const { label, icon: Icon, variant } = config[type];

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="w-full sm:w-auto"
    >
      <Icon className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}