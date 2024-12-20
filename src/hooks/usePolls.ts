import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getPolls as getPollsApi, vote as voteApi } from '@/lib/api/polls';
import type { PollWithOptions } from '@/types/polls';

export function usePolls() {
  const { user } = useAuth();
  const [polls, setPolls] = useState<PollWithOptions[]>([]);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadPolls();
  }, []);

  async function loadPolls() {
    try {
      const data = await getPollsApi();
      setPolls(data);
      
      // Track user votes
      const votes = new Set<string>();
      data.forEach(poll => {
        poll.options.forEach(option => {
          if (option.has_voted) {
            votes.add(option.id);
          }
        });
      });
      setUserVotes(votes);
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load polls'));
    } finally {
      setLoading(false);
    }
  }

  const vote = async (pollId: string, optionId: string) => {
    try {
      await voteApi(pollId, optionId);
      setUserVotes(prev => new Set(prev).add(optionId));
      await loadPolls();
    } catch (error) {
      throw error;
    }
  };

  return {
    polls,
    userVotes,
    loading,
    error,
    vote,
    refresh: loadPolls
  };
}