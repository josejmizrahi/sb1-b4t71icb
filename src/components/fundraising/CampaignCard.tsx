import { format } from 'date-fns';
import { User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card } from '../ui/card';
import { cn } from '@/lib/utils';
import type { CampaignWithCreator } from '@/types/fundraising';

interface CampaignCardProps {
  campaign: CampaignWithCreator;
  onDonate: (campaignId: string) => void;
  className?: string;
}

export function CampaignCard({ campaign, onDonate, className }: CampaignCardProps) {
  const navigate = useNavigate();
  const progress = (campaign.current_amount / campaign.goal_amount) * 100;
  const daysLeft = Math.ceil(
    (new Date(campaign.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const handleClick = () => {
    navigate(`/fundraising/${campaign.id}`);
  };

  const handleDonateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDonate(campaign.id);
  };

  return (
    <Card 
      className={cn(
        "overflow-hidden hover:border-primary/20 transition-colors cursor-pointer", 
        className
      )}
      onClick={handleClick}
    >
      {campaign.image_url && (
        <div className="aspect-video w-full overflow-hidden">
          <img
            src={campaign.image_url}
            alt={campaign.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}

      <div className="p-6 space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="capitalize">
              {campaign.category}
            </Badge>
            <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
              {campaign.status}
            </Badge>
          </div>

          <h3 className="font-semibold leading-tight line-clamp-2">
            {campaign.title}
          </h3>

          <p className="text-sm text-muted-foreground line-clamp-2">
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
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{Math.round(progress)}% funded</span>
            <span>{daysLeft} days left</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={campaign.creator?.avatar_url ?? undefined} />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">
              by {campaign.creator?.display_name || 'Anonymous'}
            </span>
          </div>

          <Button
            size="sm"
            onClick={handleDonateClick}
            disabled={campaign.status !== 'active'}
          >
            Donate
          </Button>
        </div>
      </div>
    </Card>
  );
}