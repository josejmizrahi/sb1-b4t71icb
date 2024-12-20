export interface VerificationRequest {
  id: number;
  profile_id: string;
  status: 'pending' | 'approved' | 'rejected';
  verification_type: 'identity' | 'rabbinical' | 'community';
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  documents_url: string[];
  notes: string | null;
  rabbinical_reference: string | null;
}

export interface Profile {
  display_name: string | null;
  email: string;
  avatar_url: string | null;
}

export interface VerificationRequestWithProfile extends VerificationRequest {
  profile: Profile;
}