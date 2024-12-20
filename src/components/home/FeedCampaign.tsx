import { Coins, MessageSquare, Share2, ThumbsUp, User } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card } from '../ui/card';
import { ActionButton } from '../ui/action-button';
import type { CampaignWithCreator } from '@/types/fundraising';

interface FeedCampaignProps {
  campaign: CampaignWithCreator;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onDonate?: () => void;
}

export function FeedCampaign({ campaign, onLike, onComment, onShare, onDonate }: FeedCampaignProps) {
  const navigate = useNavigate();
  const progress = (campaign.current_amount / campaign.goal_amount) * 100;
  const daysLeft = Math.ceil(
    (new Date(campaign.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const handleClick = () => {
    navigate(`/fundraising/${campaign.id}`);
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
              <AvatarImage src={campaign.creator?.avatar_url ?? undefined} />
              <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{campaign.creator?.display_name || 'Anonymous'}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(campaign.created_at), 'MMM d')}
              </p>
            </div>
          </div>
          <div className="flex-shrink-0 p-2 bg-green-50 rounded-lg">
            <Coins className="h-5 w-5 text-green-500" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Campaign</Badge>
            <Badge>{campaign.category}</Badge>
            <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
              {campaign.status}
            </Badge>
          </div>

          <div>
            <h3 className="font-medium">{campaign.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {campaign.description}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                ${campaign.current_amount.toLocaleString()}
              </span>
              <span className="font-medium">
                ${campaign.goal_amount.toLocaleString()}
              </span>
            </div>
            <Progress value={progress} />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{Math.round(progress)}% funded</span>
              <span>{daysLeft} days left</span>
            </div>
          </div>

          <div className="flex justify-end">
            <ActionButton 
              type="campaign" 
              onClick={(e) => handleAction(e, onDonate!)}
              disabled={campaign.status !== 'active'}
            />
          </div>
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