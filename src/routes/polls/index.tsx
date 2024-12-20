import { useState } from 'react';
import { Container } from '@/components/layout/Container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePolls } from '@/hooks/usePolls';
import { PollCard } from '@/components/polls/PollCard';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/components/ui/use-toast';

export default function PollsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { polls, loading, error, vote, userVotes } = usePolls();

  const handleVote = async (pollId: string, optionId: string) => {
    try {
      await vote(pollId, optionId);
      toast({
        title: "Vote submitted",
        description: "Your vote has been recorded"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit vote",
        variant: "destructive"
      });
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <Container className="py-6">
      <div className="flex items-center justify-between mb-6">
        <PageHeader 
          title="Polls" 
          description="Vote and share your opinion on community matters"
        />
        <Button onClick={() => navigate('/polls/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Poll
        </Button>
      </div>

      <div className="grid gap-6">
        {polls.map((poll) => (
          <PollCard
            key={poll.id}
            poll={poll}
            onVote={handleVote}
            userVotes={userVotes}
          />
        ))}
      </div>
    </Container>
  );
}