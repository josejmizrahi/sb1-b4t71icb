import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { DatePicker } from '../ui/date-picker';
import { useAuth } from '@/lib/auth/AuthContext';

interface FundraisingFormProps {
  onSuccess?: () => void;
}

export function FundraisingForm({ onSuccess }: FundraisingFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goal: '',
    endDate: undefined as Date | undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // TODO: Implement fundraising campaign creation
      onSuccess?.();
    } catch (error) {
      console.error('Failed to create campaign:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Campaign Title</label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Give your campaign a clear title"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Explain your campaign's purpose and goals"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Fundraising Goal</label>
          <Input
            type="number"
            value={formData.goal}
            onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
            placeholder="Enter amount"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">End Date</label>
          <DatePicker
            date={formData.endDate}
            onDateChange={(date) => setFormData({ ...formData, endDate: date })}
            placeholder="Select end date"
          />
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Creating...' : 'Create Campaign'}
      </Button>
    </form>
  );
}