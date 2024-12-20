import { useState } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { submitVote } from '@/lib/api/governance';
import { useAuth } from '@/lib/auth/AuthContext';
import { useToast } from '../ui/use-toast';
import type { ProposalWithVotes } from '@/types/governance';

interface VoteDialogProps {
  proposal: ProposalWithVotes;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVoteSubmitted: () => void;
}

export function VoteDialog({ 
  proposal, 
  open, 
  onOpenChange,
  onVoteSubmitted 
}: VoteDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [choice, setChoice] = useState<'yes' | 'no' | 'abstain'>('yes');
  const [comment, setComment] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      await submitVote({
        proposal_id: proposal.id,
        voter_id: user.id,
        choice,
        comment: comment.trim() || null
      });

      toast({
        title: "Vote submitted",
        description: "Your vote has been recorded successfully"
      });

      onVoteSubmitted();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit vote",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vote on Proposal</DialogTitle>
          <DialogDescription>{proposal.title}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Your Vote</label>
            <Select
              value={choice}
              onValueChange={(value: typeof choice) => setChoice(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes - Support</SelectItem>
                <SelectItem value="no">No - Oppose</SelectItem>
                <SelectItem value="abstain">Abstain</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Comment (Optional)</label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your thoughts on this proposal..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Vote'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}