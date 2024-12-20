export interface Proposal {
  id: string;
  title: string;
  description: string;
  creator_id: string;
  category: 'general' | 'policy' | 'technical' | 'financial';
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  voting_end_date: string;
  created_at: string;
  updated_at: string;
  min_points_required: number;
}

export interface Vote {
  id: string;
  proposal_id: string;
  voter_id: string;
  choice: 'yes' | 'no' | 'abstain';
  comment: string | null;
  created_at: string;
}

export interface ProposalWithVotes extends Proposal {
  votes: Vote[];
  creator: {
    display_name: string | null;
    avatar_url: string | null;
  };
}