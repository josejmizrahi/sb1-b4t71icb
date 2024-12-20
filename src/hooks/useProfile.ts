import { useState, useEffect } from 'react';
import { getProfile } from '@/lib/api/profiles';
import type { Profile } from '@/types/profiles';

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    async function loadProfile() {
      try {
        const data = await getProfile(userId);
        setProfile(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load profile'));
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [userId]);

  return { profile, loading, error };
}