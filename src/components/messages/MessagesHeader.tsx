import { Search } from 'lucide-react';
import { Input } from '../ui/input';
import { NewMessageButton } from './NewMessageButton';

interface MessagesHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  onConversationCreated: () => void;
}

export function MessagesHeader({ 
  search, 
  onSearchChange,
  onConversationCreated
}: MessagesHeaderProps) {
  return (
    <div className="p-4 space-y-4 border-b">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Messages</h1>
        <NewMessageButton onConversationCreated={onConversationCreated} />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search messages..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  );
}