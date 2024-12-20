import { useState } from 'react';
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
import { Switch } from '../ui/switch';
import { createEvent } from '@/lib/api/events';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePoints } from '@/hooks/usePoints';

interface EventFormProps {
  onSuccess?: () => void;
}

export function EventForm({ onSuccess }: EventFormProps) {
  const { user } = useAuth();
  const { awardPointsForAction } = usePoints();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'cultural',
    start_time: '',
    end_time: '',
    location: '',
    max_attendees: '',
    is_online: false,
    meeting_link: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const event = await createEvent({
        ...formData,
        creator_id: user.id,
        max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : null
      });
      
      await awardPointsForAction('CREATE_EVENT', event.id);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to create event:', error);
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
          <label className="text-sm font-medium">Event Type</label>
          <Select
            value={formData.event_type}
            onValueChange={(value) => setFormData({ ...formData, event_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cultural">Cultural</SelectItem>
              <SelectItem value="educational">Educational</SelectItem>
              <SelectItem value="governance">Governance</SelectItem>
              <SelectItem value="social">Social</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Max Attendees</label>
          <Input
            type="number"
            value={formData.max_attendees}
            onChange={(e) => setFormData({ ...formData, max_attendees: e.target.value })}
            placeholder="Leave empty for unlimited"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Start Time</label>
          <Input
            type="datetime-local"
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">End Time</label>
          <Input
            type="datetime-local"
            value={formData.end_time}
            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={formData.is_online}
          onCheckedChange={(checked) => setFormData({ ...formData, is_online: checked })}
        />
        <label className="text-sm font-medium">Online Event</label>
      </div>

      {formData.is_online ? (
        <div className="space-y-2">
          <label className="text-sm font-medium">Meeting Link</label>
          <Input
            type="url"
            value={formData.meeting_link}
            onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
            placeholder="https://..."
            required
          />
        </div>
      ) : (
        <div className="space-y-2">
          <label className="text-sm font-medium">Location</label>
          <Input
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Event location"
            required
          />
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Creating...' : 'Create Event'}
      </Button>
    </form>
  );
}