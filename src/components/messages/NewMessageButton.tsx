import { Plus } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { NewConversationForm } from './NewConversationForm';

interface NewMessageButtonProps {
  onConversationCreated: () => void;
}

export function NewMessageButton({ onConversationCreated }: NewMessageButtonProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Message
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>
        <NewConversationForm onSuccess={onConversationCreated} />
      </DialogContent>
    </Dialog>
  );
}