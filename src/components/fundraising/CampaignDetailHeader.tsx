import { format } from 'date-fns';
import { Share2, User, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useNavigate } from 'react-router-dom';
import type { CampaignWithCreator } from '@/types/fundraising';

interface CampaignDetailHeaderProps {
  campaign: CampaignWithCreator;
  onDonate: () => void;
  onShare: () => void;
}

export function CampaignDetailHeader({ 
  campaign, 
  onDonate,
  onShare 
}: CampaignDetailHeaderProps) {
  const navigate = useNavigate();
  const progress = (campaign.current_amount / campaign.goal_amount) * 100;
  const daysLeft = Math.ceil(
    (new Date(campaign.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="relative space-y-6">
      {/* Back button and share - Mobile */}
      <div className="flex items-center justify-between md:hidden">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onShare}
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Hero Image */}
      <div className="aspect-video w-full overflow-hidden rounded-lg md:rounded-xl">
        <img
          src={campaign.image_url || "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&q=80"}
          alt={campaign.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{campaign.category}</Badge>
            <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
              {campaign.status}
            </Badge>
          </div>
          
          <h1 className="text-2xl font-bold md:text-3xl">{campaign.title}</h1>

          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={campaign.creator?.avatar_url ?? undefined} />
              <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
            </Avatar>
            <span className="text-muted-foreground">
              by {campaign.creator?.display_name || 'Anonymous'}
            </span>
          </div>
        </div>

        <div className="bg-card rounded-lg p-4 md:p-6 space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              ${campaign.current_amount.toLocaleString()} raised
            </span>
            <span className="font-medium">
              ${campaign.goal_amount.toLocaleString()}
            </span>
          </div>
          <Progress value={progress} />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{Math.round(progress)}% of goal</span>
            <span>{daysLeft} days left</span>
          </div>
        </div>

        {/* Share button - Desktop */}
        <div className="hidden md:flex items-center justify-between">
          <Button
            variant="outline"
            size="icon"
            onClick={onShare}
          >
            <Share2 className="h-4 w-4" />
          </Button>

          <Button
            onClick={onDonate}
            className="min-w-[120px]"
            disabled={campaign.status !== 'active'}
          >
            Donate Now
          </Button>
        </div>

        {/* Donate button - Mobile */}
        <div className="md:hidden">
          <Button
            onClick={onDonate}
            className="w-full"
            size="lg"
            disabled={campaign.status !== 'active'}
          >
            Donate Now
          </Button>
        </div>
      </div>
    </div>
  );
}