import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { updateProfile, uploadAvatar } from '@/lib/api/profiles';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { useToast } from '../ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { User, Upload } from 'lucide-react';

export function ProfileForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    location: '',
    interests: '',
    skills: ''
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setLoading(true);
      const avatarUrl = await uploadAvatar(user.id, file);
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully"
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload avatar",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      await updateProfile(user.id, {
        display_name: formData.display_name,
        bio: formData.bio,
        location: formData.location,
        interests: formData.interests.split(',').map(i => i.trim()),
        skills: formData.skills.split(',').map(s => s.trim())
      });

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully"
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center space-x-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={user?.user_metadata.avatar_url} />
          <AvatarFallback>
            <User className="h-8 w-8" />
          </AvatarFallback>
        </Avatar>
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById('avatar-upload')?.click()}
            disabled={loading}
          >
            <Upload className="h-4 w-4 mr-2" />
            Change Avatar
          </Button>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Display Name</label>
          <Input
            value={formData.display_name}
            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Bio</label>
          <Textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Tell us about yourself..."
          />
        </div>

        <div>
          <label className="text-sm font-medium">Location</label>
          <Input
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Interests</label>
          <Input
            value={formData.interests}
            onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
            placeholder="Torah study, Jewish history, etc. (comma-separated)"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Skills</label>
          <Input
            value={formData.skills}
            onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
            placeholder="Teaching, organizing events, etc. (comma-separated)"
          />
        </div>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  );
}