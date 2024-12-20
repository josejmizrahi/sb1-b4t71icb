import { useState } from 'react';
import { addDays } from 'date-fns';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { createProposal } from '@/lib/api/governance';
import { useAuth } from '@/lib/auth/AuthContext';
import { useToast } from '../ui/use-toast';
import type { Proposal } from '@/types/governance';

export function ProposalForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'general',
    min_points_required: '100'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      await createProposal({
        ...formData,
        creator_id: user.id,
        status: 'active',
        voting_end_date: addDays(new Date(), 7).toISOString(),
        min_points_required: parseInt(formData.min_points_required)
      });

      toast({
        title: "Proposal created",
        description: "Your proposal has been submitted for voting"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create proposal",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Title</label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Category</label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="policy">Policy</SelectItem>
              <SelectItem value="technical">Technical</SelectItem>
              <SelectItem value="financial">Financial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Minimum Points Required</label>
          <Input
            type="number"
            value={formData.min_points_required}
            onChange={(e) => setFormData({ ...formData, min_points_required: e.target.value })}
            min="0"
            required
          />
        </div>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Proposal'}
      </Button>
    </form>
  );
}