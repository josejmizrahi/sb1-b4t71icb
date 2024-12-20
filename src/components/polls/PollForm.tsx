import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { DatePicker } from '../ui/date-picker';
import { createPoll } from '@/lib/api/polls';
import { useToast } from '../ui/use-toast';

interface PollFormProps {
  onSuccess?: () => void;
}

export function PollForm({ onSuccess }: PollFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState(['', '']);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    expiryDate: undefined as Date | undefined,
    allowMultipleVotes: false
  });

  const addOption = () => {
    setOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.expiryDate) {
      toast({
        title: "Error",
        description: "Please select an expiry date",
        variant: "destructive"
      });
      return;
    }

    const validOptions = options.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      toast({
        title: "Error",
        description: "Please add at least two options",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await createPoll(
        {
          title: formData.title,
          description: formData.description,
          expiry_date: formData.expiryDate.toISOString(),
          allow_multiple_votes: formData.allowMultipleVotes
        },
        validOptions
      );

      toast({
        title: "Success",
        description: "Poll created successfully"
      });
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create poll",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Question</label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="What would you like to ask?"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description (Optional)</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Add more context to your question"
        />
      </div>

      <div className="space-y-4">
        <label className="text-sm font-medium">Options</label>
        {options.map((option, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              placeholder={`Option ${index + 1}`}
              required
            />
            {options.length > 2 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeOption(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={addOption}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Option
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Expiry Date</label>
          <DatePicker
            date={formData.expiryDate}
            onDateChange={(date) => setFormData({ ...formData, expiryDate: date })}
            placeholder="Select when the poll ends"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Allow Multiple Votes</label>
          <Switch
            checked={formData.allowMultipleVotes}
            onCheckedChange={(checked) => 
              setFormData({ ...formData, allowMultipleVotes: checked })
            }
          />
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Creating...' : 'Create Poll'}
      </Button>
    </form>
  );
}