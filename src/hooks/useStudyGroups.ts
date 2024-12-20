import { useState, useEffect } from 'react';
import { getStudyGroups } from '@/lib/api/studyGroups';
import type { StudyGroup } from '@/types/studyGroups';

export function useStudyGroups() {
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadStudyGroups();
  }, []);

  async function loadStudyGroups() {
    try {
      const data = await getStudyGroups();
      setStudyGroups(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load study groups'));
    } finally {
      setLoading(false);
    }
  }

  return {
    studyGroups,
    loading,
    error,
    refresh: loadStudyGroups
  };
}