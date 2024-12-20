import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '../ui/input';
import { useMembers } from '@/hooks/useMembers';
import { useAuth } from '@/lib/auth/AuthContext';
import { getOrCreateConversation } from '@/lib/api/messages';
import { useToast } from '@/components/ui/use-toast';
import { MemberList } from './MemberList';

interface NewConversationFormProps {
  onSuccess?: () => void;
}

export function NewConversationForm({ onSuccess }: NewConversationFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const { members } = useMembers();

  const filteredMembers = members.filter(member => 
    member.id !== user?.id &&
    (member.display_name?.toLowerCase().includes(search.toLowerCase()) ||
     member.username.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSelectMember = async (memberId: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      await getOrCreateConversation(user.id, memberId);
      onSuccess?.();
      toast({
        title: "Success",
        description: "Conversation created"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <MemberList
        members={filteredMembers}
        onSelect={handleSelectMember}
        loading={loading}
      />
    </div>
  );
}