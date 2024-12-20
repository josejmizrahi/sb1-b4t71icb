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
import { createStudyGroup } from '@/lib/api/studyGroups';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import type { StudyGroup } from '@/types/studyGroups';

export function StudyGroupForm() {
  const { user } = useAuth();
  const { awardPointsForAction } = usePoints();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    topic: '',
    level: 'beginner',
    max_members: '',
    schedule: {
      frequency: 'weekly',
      day: 'sunday',
      time: '18:00',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const group = await createStudyGroup({
        ...formData,
        creator_id: user.id,
        max_members: formData.max_members ? parseInt(formData.max_members) : null
      });
      await awardPointsForAction('CREATE_STUDY_GROUP', group.id);
    } catch (error) {
      console.error('Failed to create study group:', error);
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
          <label className="text-sm font-medium">Topic</label>
          <Input
            value={formData.topic}
            onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Level</label>
          <Select
            value={formData.level}
            onValueChange={(value) => setFormData({ ...formData, level: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Study Group'}
      </Button>
    </form>
  );
}