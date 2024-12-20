import { PointsAction } from '@/types/points';

export const POINTS_ACTIONS: Record<string, PointsAction> = {
  COMPLETE_PROFILE: {
    type: 'complete_profile',
    points: 50,
    description: 'Completed profile information'
  },
  JOIN_EVENT: {
    type: 'join_event',
    points: 20,
    description: 'Joined a community event'
  },
  CREATE_EVENT: {
    type: 'create_event',
    points: 30,
    description: 'Created a community event'
  },
  JOIN_STUDY_GROUP: {
    type: 'join_study_group',
    points: 25,
    description: 'Joined a study group'
  },
  CREATE_STUDY_GROUP: {
    type: 'create_study_group',
    points: 35,
    description: 'Created a study group'
  }
} as const;