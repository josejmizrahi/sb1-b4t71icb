import { supabase } from '../supabase';
import type { StudyGroup, StudyGroupMember } from '@/types/studyGroups';

export async function getStudyGroups() {
  const { data, error } = await supabase
    .from('study_groups')
    .select(`
      *,
      members:study_group_members(
        profile:profiles(id, display_name, avatar_url)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getStudyGroup(id: string) {
  const { data, error } = await supabase
    .from('study_groups')
    .select(`
      *,
      members:study_group_members(
        profile:profiles(id, display_name, avatar_url)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createStudyGroup(group: Partial<StudyGroup>) {
  const { data, error } = await supabase
    .from('study_groups')
    .insert(group)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function joinStudyGroup(groupId: string, userId: string) {
  const { error } = await supabase
    .from('study_group_members')
    .insert({
      group_id: groupId,
      profile_id: userId,
      role: 'member'
    });

  if (error) throw error;
}

export async function leaveStudyGroup(groupId: string, userId: string) {
  const { error } = await supabase
    .from('study_group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('profile_id', userId);

  if (error) throw error;
}