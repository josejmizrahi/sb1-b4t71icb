export interface Profile {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  interests: string[];
  skills: string[];
  total_points: number;
  join_date: string;
  verified: boolean;
  status: string;
  last_active: string | null;
}