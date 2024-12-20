import { Progress } from '../ui/progress';

interface CampaignProgressProps {
  currentAmount: number;
  goalAmount: number;
  daysLeft: number;
}

export function CampaignProgress({ currentAmount, goalAmount, daysLeft }: CampaignProgressProps) {
  const progress = (currentAmount / goalAmount) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          ${currentAmount.toLocaleString()}
        </span>
        <span className="font-medium">
          ${goalAmount.toLocaleString()}
        </span>
      </div>
      <Progress value={progress} className="h-2" />
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{Math.round(progress)}% funded</span>
        <span>{daysLeft} days left</span>
      </div>
    </div>
  );
}