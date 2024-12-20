import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { getPointsHistory } from '@/lib/api/points';
import { useAuth } from '@/lib/auth/AuthContext';
import type { PointsLog } from '@/types/points';

export function PointsHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<PointsLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function loadHistory() {
      try {
        const data = await getPointsHistory(user.id);
        setHistory(data);
      } catch (error) {
        console.error('Failed to load points history:', error);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-muted rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center justify-between p-4 bg-card rounded-lg"
        >
          <div>
            <p className="font-medium">{entry.description || entry.action_type}</p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(entry.created_at), 'PPp')}
            </p>
          </div>
          <span className="font-medium text-primary">+{entry.points}</span>
        </div>
      ))}
    </div>
  );
}