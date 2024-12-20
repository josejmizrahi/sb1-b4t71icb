import { useState, useEffect } from 'react';
import { getMembers } from '@/lib/api/profiles';
import type { Profile } from '@/types/profiles';

export function useMembers() {
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    try {
      const data = await getMembers();
      setMembers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load members'));
    } finally {
      setLoading(false);
    }
  }

  return {
    members,
    loading,
    error,
    refresh: loadMembers
  };
}