import { format } from 'date-fns';
import { User } from 'lucide-react';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import type { PollWithOptions } from '@/types/polls';

interface PollCardProps {
  poll: PollWithOptions;
  onVote: (pollId: string, optionId: string) => void;
  userVotes?: Set<string>;
}

export function PollCard({ poll, onVote, userVotes }: PollCardProps) {
  const isActive = poll.status === 'active' && new Date(poll.expiry_date) > new Date();
  const hasVoted = poll.options.some(opt => userVotes?.has(opt.id));

  return (
    <div className="bg-white rounded-lg border hover:border-primary/20 transition-colors">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={poll.creator.avatar_url ?? undefined} />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">
              by {poll.creator.display_name}
            </span>
          </div>
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? 'Active' : 'Closed'}
          </Badge>
        </div>

        <div>
          <h3 className="font-medium">{poll.title}</h3>
          {poll.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {poll.description}
            </p>
          )}
        </div>

        <div className="space-y-3">
          {poll.options.map((option) => {
            const percentage = poll.total_votes > 0
              ? (option.vote_count / poll.total_votes) * 100
              : 0;

            return (
              <div key={option.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{option.text}</span>
                  {(hasVoted || !isActive) && (
                    <span className="text-sm text-muted-foreground">
                      {Math.round(percentage)}% ({option.vote_count} votes)
                    </span>
                  )}
                </div>
                {(hasVoted || !isActive) ? (
                  <Progress value={percentage} />
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => onVote(poll.id, option.id)}
                  >
                    Vote
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-between text-sm text-muted-foreground pt-4 border-t">
          <span>{poll.total_votes} total votes</span>
          <span>
            {isActive
              ? `Ends ${format(new Date(poll.expiry_date), 'PP')}`
              : `Ended ${format(new Date(poll.expiry_date), 'PP')}`
            }
          </span>
        </div>
      </div>
    </div>
  );
}