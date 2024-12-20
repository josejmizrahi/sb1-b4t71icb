import { supabase } from '../supabase';
import type { PointsLog } from '@/types/points';

export async function getPointsHistory(userId: string) {
  const { data, error } = await supabase
    .from('points_log')
    .select('*')
    .eq('profile_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as PointsLog[];
}

export async function getTotalPoints(userId: string) {
  const { data, error } = await supabase
    .rpc('get_user_stats', { user_id: userId });

  if (error) throw error;
  return data?.total_points || 0;
}

export async function awardPoints(
  userId: string,
  action: string,
  points: number,
  referenceId?: string
) {
  const { error } = await supabase.rpc('award_points', {
    user_id: userId,
    action,
    points,
    ref_id: referenceId
  });

  if (error) throw error;
}