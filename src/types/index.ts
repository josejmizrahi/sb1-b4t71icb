export interface Member {
  id: string;
  name: string;
  email: string;
  role: 'member' | 'leader' | 'admin';
  skills: string[];
  location: string;
  joinedAt: Date;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  category: 'education' | 'culture' | 'technology' | 'community' | 'governance';
  status: 'proposed' | 'active' | 'completed';
  members: string[];
  createdAt: Date;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: Date;
  location: string;
  type: 'cultural' | 'educational' | 'governance' | 'social';
  attendees: string[];
}