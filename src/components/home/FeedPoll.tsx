import { Vote, MessageSquare, Share2, ThumbsUp, User } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card } from '../ui/card';
import type { PollWithOptions } from '@/types/polls';

interface FeedPollProps {
  poll: PollWithOptions;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
}

export function FeedPoll({ poll, onLike, onComment, onShare }: FeedPollProps) {
  const navigate = useNavigate();
  const isActive = poll.status === 'active' && new Date(poll.expiry_date) > new Date();

  const handleClick = () => {
    navigate(`/polls/${poll.id}`);
  };

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <Card 
      className="overflow-hidden hover:border-primary/20 transition-colors cursor-pointer"
      onClick={handleClick}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={poll.creator?.avatar_url ?? undefined} />
              <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{poll.creator?.display_name}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(poll.created_at), 'MMM d')}
              </p>
            </div>
          </div>
          <div className="flex-shrink-0 p-2 bg-orange-500/10 rounded-lg">
            <Vote className="h-5 w-5 text-orange-500" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Poll</Badge>
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
            {poll.options.slice(0, 3).map((option) => {
              const percentage = poll.total_votes > 0
                ? (option.vote_count / poll.total_votes) * 100
                : 0;

              return (
                <div key={option.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{option.text}</span>
                    <span className="text-muted-foreground">
                      {Math.round(percentage)}%
                    </span>
                  </div>
                  <Progress value={percentage} />
                </div>
              );
            })}
          </div>

          <p className="text-sm text-muted-foreground">
            {poll.total_votes} votes • Ends {format(new Date(poll.expiry_date), 'PP')}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-4 pt-4 border-t flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => handleAction(e, onLike!)}
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              Like
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => handleAction(e, onComment!)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Comment
            </Button>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => handleAction(e, onShare!)}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>
    </Card>
  );
}