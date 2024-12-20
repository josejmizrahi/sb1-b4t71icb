import { supabase } from '../supabase';
import type { VerificationRequestWithProfile } from '@/types/verification';

export async function getVerificationRequests() {
  const { data, error } = await supabase
    .from('verification_requests')
    .select(`
      *,
      profile:profiles(
        display_name,
        email,
        avatar_url
      )
    `)
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return data as VerificationRequestWithProfile[];
}

export async function updateVerificationStatus(
  id: number,
  status: 'approved' | 'rejected',
  notes?: string
) {
  const { error } = await supabase
    .from('verification_requests')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: (await supabase.auth.getUser()).data.user?.id,
      notes: notes,
    })
    .eq('id', id);

  if (error) throw error;
}

export async function bulkUpdateVerificationStatus(
  ids: number[],
  status: 'approved' | 'rejected',
  notes?: string
) {
  const { error } = await supabase
    .from('verification_requests')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: (await supabase.auth.getUser()).data.user?.id,
      notes: notes,
    })
    .in('id', ids);

  if (error) throw error;
}