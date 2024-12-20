import { MessageSquare } from 'lucide-react';
import { EmptyState } from '../ui/empty-state';

export function EmptyThread() {
  return (
    <div className="flex h-full items-center justify-center p-4">
      <EmptyState
        icon={MessageSquare}
        title="No conversation selected"
        description="Choose a conversation to start messaging"
      />
    </div>
  );
}