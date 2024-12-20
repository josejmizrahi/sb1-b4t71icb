import { useState, useEffect } from 'react';
import { getCampaignDonations } from '@/lib/api/fundraising';
import type { DonationWithDonor } from '@/types/fundraising';

export function useCampaignDonations(campaignId: string) {
  const [donations, setDonations] = useState<DonationWithDonor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDonations();
  }, [campaignId]);

  async function loadDonations() {
    try {
      const data = await getCampaignDonations(campaignId);
      setDonations(data);
    } catch (error) {
      console.error('Failed to load donations:', error);
    } finally {
      setLoading(false);
    }
  }

  return { donations, loading, refresh: loadDonations };
}