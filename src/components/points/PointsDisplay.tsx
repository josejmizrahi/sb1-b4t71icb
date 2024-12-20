import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { getTotalPoints } from '@/lib/api/points';
import { useAuth } from '@/lib/auth/AuthContext';

export function PointsDisplay() {
  const { user } = useAuth();
  const [points, setPoints] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function loadPoints() {
      try {
        const total = await getTotalPoints(user.id);
        setPoints(total);
      } catch (error) {
        console.error('Failed to load points:', error);
      } finally {
        setLoading(false);
      }
    }

    loadPoints();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 bg-primary/10 p-2 rounded-full animate-pulse">
        <Trophy className="h-4 w-4 text-primary" />
        <div className="h-4 w-8 bg-primary/20 rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-primary/10 p-2 rounded-full">
      <Trophy className="h-4 w-4 text-primary" />
      <span className="font-medium text-sm">{points}</span>
    </div>
  );
}