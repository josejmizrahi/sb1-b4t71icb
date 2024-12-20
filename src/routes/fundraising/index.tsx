import { useState } from 'react';
import { Container } from '@/components/layout/Container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCampaigns } from '@/hooks/useCampaigns';
import { CampaignCard } from '@/components/fundraising/CampaignCard';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/components/ui/use-toast';

export default function FundraisingPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { campaigns, loading, error } = useCampaigns();

  const handleDonate = (campaignId: string) => {
    navigate(`/fundraising/${campaignId}`);
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <Container className="py-6">
      <div className="flex items-center justify-between mb-6">
        <PageHeader 
          title="Fundraising" 
          description="Support community initiatives and make a difference"
        />
        <Button onClick={() => navigate('/fundraising/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Start Campaign
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((campaign) => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            onDonate={handleDonate}
          />
        ))}
      </div>
    </Container>
  );
}