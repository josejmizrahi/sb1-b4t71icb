export interface PointsLog {
  id: string;
  profile_id: string;
  points: number;
  action_type: string;
  description: string | null;
  reference_id: string | null;
  created_at: string;
}

export interface PointsAction {
  type: string;
  points: number;
  description: string;
}