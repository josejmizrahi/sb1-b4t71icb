import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { getCampaign } from '@/lib/api/fundraising';
import type { CampaignWithCreator } from '@/types/fundraising';

export function useCampaign(id: string | undefined) {
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<CampaignWithCreator>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    loadCampaign();
  }, [id]);

  async function loadCampaign() {
    try {
      const data = await getCampaign(id!);
      setCampaign(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load campaign details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  return { campaign, loading, refresh: loadCampaign };
}