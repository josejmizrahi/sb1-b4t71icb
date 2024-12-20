import { useEffect, useState } from 'react';
import { getVerificationStatus } from '@/lib/api/verification';
import { Badge } from '../ui/badge';

export function VerificationStatus() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const data = await getVerificationStatus();
        setStatus(data?.status || null);
      } catch (error) {
        console.error('Failed to fetch verification status:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!status) return null;

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-muted-foreground">Verification Status:</span>
      <Badge variant={status === 'approved' ? 'success' : 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    </div>
  );
}