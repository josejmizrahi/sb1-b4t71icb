import { useParams } from 'react-router-dom';
import { Container } from '@/components/layout/Container';
import { CampaignDetailHeader } from '@/components/fundraising/CampaignDetailHeader';
import { CampaignDetailContent } from '@/components/fundraising/CampaignDetailContent';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/components/ui/use-toast';
import { useCampaign } from '@/hooks/useCampaign';

export default function CampaignDetailPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const { campaign, loading } = useCampaign(id);

  if (loading) return <LoadingSpinner />;
  if (!campaign) return <div>Campaign not found</div>;

  const handleDonate = () => {
    // TODO: Implement donation flow
    toast({
      title: "Coming soon",
      description: "Donation functionality will be available soon"
    });
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: campaign.title,
        text: campaign.description,
        url: window.location.href
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Campaign link copied to clipboard"
      });
    }
  };

  return (
    <Container className="py-4 md:py-8">
      <CampaignDetailHeader
        campaign={campaign}
        onDonate={handleDonate}
        onShare={handleShare}
      />
      <CampaignDetailContent campaign={campaign} />
    </Container>
  );
}