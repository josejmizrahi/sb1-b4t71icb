import { useState, useEffect } from 'react';
import { getCampaigns } from '@/lib/api/fundraising';
import type { CampaignWithCreator } from '@/types/fundraising';

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<CampaignWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function loadCampaigns() {
    try {
      const data = await getCampaigns();
      setCampaigns(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load campaigns'));
    } finally {
      setLoading(false);
    }
  }

  return {
    campaigns,
    loading,
    error,
    refresh: loadCampaigns
  };
}