import { useState } from 'react';
import { awardPoints } from '@/lib/api/points';
import { POINTS_ACTIONS } from '@/lib/constants/pointsActions';
import { useAuth } from '@/lib/auth/AuthContext';

export function usePoints() {
  const { user } = useAuth();
  const [awarding, setAwarding] = useState(false);

  const awardPointsForAction = async (
    actionType: keyof typeof POINTS_ACTIONS,
    referenceId?: string
  ) => {
    if (!user || awarding) return;

    const action = POINTS_ACTIONS[actionType];
    if (!action) return;

    setAwarding(true);
    try {
      await awardPoints(
        user.id,
        action.type,
        action.points,
        referenceId
      );
    } catch (error) {
      console.error('Failed to award points:', error);
      throw error;
    } finally {
      setAwarding(false);
    }
  };

  return {
    awardPointsForAction,
    awarding
  };
}