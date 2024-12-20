import { supabase } from '../supabase';

export interface PrivacySettings {
  profile_visibility: 'public' | 'members' | 'private';
  show_online_status: boolean;
  show_last_active: boolean;
  allow_messages: boolean;
  show_achievements: boolean;
}

export async function getPrivacySettings(): Promise<PrivacySettings> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('privacy_settings')
    .single();

  if (error) throw error;
  return data.privacy_settings;
}

export async function updatePrivacySettings(settings: PrivacySettings) {
  const { error } = await supabase
    .rpc('update_privacy_settings', {
      settings
    });

  if (error) throw error;
}