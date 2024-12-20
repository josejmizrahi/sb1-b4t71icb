export interface Poll {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  status: 'active' | 'completed' | 'cancelled';
  expiry_date: string;
  allow_multiple_votes: boolean;
  created_at: string;
  updated_at: string;
}

export interface PollOption {
  id: string;
  poll_id: string;
  text: string;
  created_at: string;
}

export interface PollVote {
  id: string;
  poll_id: string;
  option_id: string;
  voter_id: string;
  created_at: string;
}

export interface PollWithOptions extends Poll {
  options: (PollOption & {
    vote_count: number;
    has_voted?: boolean;
  })[];
  creator: {
    display_name: string | null;
    avatar_url: string | null;
  };
  total_votes: number;
}