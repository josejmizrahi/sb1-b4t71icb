import { Achievement } from '@/types/achievements';

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'early_adopter',
    title: 'Early Adopter',
    description: 'One of the first members to join the community',
    icon: 'rocket',
    points: 100,
    requirements: {
      type: 'points',
      threshold: 0
    }
  },
  {
    id: 'social_butterfly',
    title: 'Social Butterfly',
    description: 'Attended 5 community events',
    icon: 'users',
    points: 150,
    requirements: {
      type: 'events',
      threshold: 5
    }
  },
  {
    id: 'scholar',
    title: 'Scholar',
    description: 'Joined 3 study groups',
    icon: 'book-open',
    points: 200,
    requirements: {
      type: 'study_groups',
      threshold: 3
    }
  },
  {
    id: 'point_collector',
    title: 'Point Collector',
    description: 'Earned 1000 JNS Points',
    icon: 'trophy',
    points: 250,
    requirements: {
      type: 'points',
      threshold: 1000
    }
  }
];