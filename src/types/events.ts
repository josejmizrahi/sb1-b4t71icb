export interface Event {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  event_type: 'cultural' | 'educational' | 'governance' | 'social';
  start_time: string;
  end_time: string | null;
  location: string | null;
  max_attendees: number | null;
  is_online: boolean;
  meeting_link: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventAttendee {
  event_id: string;
  profile_id: string;
  status: 'attending' | 'waitlist' | 'cancelled';
  joined_at: string;
  profile?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface EventWithAttendees extends Event {
  attendees: EventAttendee[];
}

export interface EventFilters {
  search: string;
  type: string;
  date?: Date;
  location: string;
}