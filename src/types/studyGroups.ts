export interface StudyGroup {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  topic: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  max_members: number | null;
  schedule: StudyGroupSchedule;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudyGroupMember {
  group_id: string;
  profile_id: string;
  role: 'member' | 'leader';
  joined_at: string;
}

export interface StudyGroupSchedule {
  frequency: 'weekly' | 'biweekly' | 'monthly';
  day: string;
  time: string;
  timezone: string;
}