import { format } from 'date-fns';
import { User } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import type { ProposalWithVotes } from '@/types/governance';

interface ProposalCardProps {
  proposal: ProposalWithVotes;
  onVote?: (proposalId: string) => void;
}

export function ProposalCard({ proposal, onVote }: ProposalCardProps) {
  const totalVotes = proposal.votes.length;
  const yesVotes = proposal.votes.filter(v => v.choice === 'yes').length;
  const noVotes = proposal.votes.filter(v => v.choice === 'no').length;
  const yesPercentage = totalVotes ? (yesVotes / totalVotes) * 100 : 0;
  const noPercentage = totalVotes ? (noVotes / totalVotes) * 100 : 0;

  return (
    <div className="bg-card p-6 rounded-lg space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarImage src={proposal.creator.avatar_url ?? undefined} />
            <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{proposal.title}</h3>
            <p className="text-sm text-muted-foreground">
              by {proposal.creator.display_name} • {format(new Date(proposal.created_at), 'PP')}
            </p>
          </div>
        </div>
        <Badge>{proposal.category}</Badge>
      </div>

      <p className="text-sm text-muted-foreground">{proposal.description}</p>

      {proposal.status === 'active' && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Yes ({yesPercentage.toFixed(1)}%)</span>
            <span>No ({noPercentage.toFixed(1)}%)</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary"
              style={{ width: `${yesPercentage}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {totalVotes} votes • Ends {format(new Date(proposal.voting_end_date), 'PP')}
          </p>
        </div>
      )}

      {proposal.status === 'active' && onVote && (
        <Button 
          onClick={() => onVote(proposal.id)}
          className="w-full"
        >
          Vote Now
        </Button>
      )}

      {proposal.status !== 'active' && (
        <Badge variant={proposal.status === 'completed' ? 'success' : 'secondary'}>
          {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
        </Badge>
      )}
    </div>
  );
}