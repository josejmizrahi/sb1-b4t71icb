import { format } from 'date-fns';
import { User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import type { CampaignWithCreator } from '@/types/fundraising';
import { useCampaignDonations } from '@/hooks/useCampaignDonations';

interface CampaignDetailContentProps {
  campaign: CampaignWithCreator;
}

export function CampaignDetailContent({ campaign }: CampaignDetailContentProps) {
  const { donations } = useCampaignDonations(campaign.id);

  return (
    <div className="mt-8 space-y-8 md:mt-12 md:grid md:grid-cols-3 md:gap-8 md:space-y-0">
      <div className="md:col-span-2 space-y-8">
        <section>
          <h2 className="text-lg font-semibold mb-4">About this campaign</h2>
          <div className="prose max-w-none">
            <p className="text-muted-foreground whitespace-pre-wrap">
              {campaign.description}
            </p>
          </div>
        </section>

        {campaign.updates?.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Campaign Updates</h2>
            <div className="space-y-4">
              {campaign.updates.map((update, index) => (
                <div key={index} className="bg-card rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    {format(new Date(update.date), 'PPP')}
                  </p>
                  <p className="whitespace-pre-wrap">{update.content}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-semibold mb-4">Recent Donations</h2>
          <div className="space-y-4">
            {donations?.map((donation) => (
              <div key={donation.id} className="flex items-start gap-3">
                <Avatar>
                  <AvatarImage src={donation.donor.avatar_url ?? undefined} />
                  <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate">
                      {donation.is_anonymous ? 'Anonymous' : donation.donor.display_name}
                    </p>
                    <Badge variant="secondary">${donation.amount}</Badge>
                  </div>
                  {donation.message && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {donation.message}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}