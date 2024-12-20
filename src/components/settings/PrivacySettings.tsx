import { useState } from 'react';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { usePrivacySettings } from '@/hooks/usePrivacySettings';
import { LoadingSpinner } from '../ui/loading-spinner';
import type { PrivacySettings as PrivacySettingsType } from '@/lib/api/privacy';

export function PrivacySettings() {
  const { settings: initialSettings, loading, updateSettings } = usePrivacySettings();
  const [settings, setSettings] = useState<PrivacySettingsType | null>(initialSettings);
  const [saving, setSaving] = useState(false);

  if (loading || !settings) return <LoadingSpinner />;

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await updateSettings(settings);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Profile Visibility</label>
          <Select
            value={settings.profile_visibility}
            onValueChange={(value: PrivacySettingsType['profile_visibility']) => 
              setSettings(prev => prev ? { ...prev, profile_visibility: value } : prev)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="members">Members Only</SelectItem>
              <SelectItem value="private">Private</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Control who can view your full profile information
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium">Show Online Status</label>
            <p className="text-sm text-muted-foreground">
              Let others see when you're online
            </p>
          </div>
          <Switch
            checked={settings.show_online_status}
            onCheckedChange={(checked) => 
              setSettings(prev => prev ? { ...prev, show_online_status: checked } : prev)
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium">Show Last Active</label>
            <p className="text-sm text-muted-foreground">
              Display when you were last active
            </p>
          </div>
          <Switch
            checked={settings.show_last_active}
            onCheckedChange={(checked) => 
              setSettings(prev => prev ? { ...prev, show_last_active: checked } : prev)
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium">Allow Direct Messages</label>
            <p className="text-sm text-muted-foreground">
              Let other members send you messages
            </p>
          </div>
          <Switch
            checked={settings.allow_messages}
            onCheckedChange={(checked) => 
              setSettings(prev => prev ? { ...prev, allow_messages: checked } : prev)
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium">Show Achievements</label>
            <p className="text-sm text-muted-foreground">
              Display your achievements on your profile
            </p>
          </div>
          <Switch
            checked={settings.show_achievements}
            onCheckedChange={(checked) => 
              setSettings(prev => prev ? { ...prev, show_achievements: checked } : prev)
            }
          />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );
}