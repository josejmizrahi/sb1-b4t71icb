export interface Campaign {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  goal_amount: number;
  current_amount: number;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  category: 'community' | 'education' | 'charity' | 'emergency' | 'other';
  image_url?: string;
  updates: any[];
  created_at: string;
  updated_at: string;
}

export interface Donation {
  id: string;
  campaign_id: string;
  donor_id: string;
  amount: number;
  message?: string;
  is_anonymous: boolean;
  status: 'pending' | 'completed' | 'failed';
  transaction_id?: string;
  created_at: string;
}

export interface CampaignWithCreator extends Campaign {
  creator: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface DonationWithDonor extends Donation {
  donor: {
    display_name: string | null;
    avatar_url: string | null;
  };
}