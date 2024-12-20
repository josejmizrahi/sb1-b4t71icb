import { useState } from 'react';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { useToast } from '../ui/use-toast';

export function NotificationSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    eventReminders: true,
    messageNotifications: true,
    studyGroupUpdates: true,
    governanceAlerts: true
  });

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your notification preferences have been updated"
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {Object.entries(settings).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between">
            <label className="text-sm font-medium">
              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            </label>
            <Switch
              checked={value}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, [key]: checked }))
              }
            />
          </div>
        ))}
      </div>

      <Button onClick={handleSave}>Save Changes</Button>
    </div>
  );
}