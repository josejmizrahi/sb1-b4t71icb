import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { getPrivacySettings, updatePrivacySettings, type PrivacySettings } from '@/lib/api/privacy';

export function usePrivacySettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const data = await getPrivacySettings();
      setSettings(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load privacy settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  const updateSettings = async (newSettings: PrivacySettings) => {
    try {
      await updatePrivacySettings(newSettings);
      setSettings(newSettings);
      toast({
        title: "Settings updated",
        description: "Your privacy settings have been updated"
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update privacy settings",
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    settings,
    loading,
    updateSettings
  };
}