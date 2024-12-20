import { supabase } from '../supabase';
import type { Proposal, Vote, ProposalWithVotes } from '@/types/governance';

export async function getProposals() {
  const { data, error } = await supabase
    .from('proposals')
    .select(`
      *,
      creator:profiles!creator_id(display_name, avatar_url),
      votes(*)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as ProposalWithVotes[];
}

export async function getProposal(id: string) {
  const { data, error } = await supabase
    .from('proposals')
    .select(`
      *,
      creator:profiles!creator_id(display_name, avatar_url),
      votes(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as ProposalWithVotes;
}

export async function createProposal(proposal: Partial<Proposal>) {
  const { data, error } = await supabase
    .from('proposals')
    .insert(proposal)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function submitVote(vote: Partial<Vote>) {
  const { data, error } = await supabase
    .from('votes')
    .insert(vote)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProposalStatus(id: string, status: Proposal['status']) {
  const { error } = await supabase
    .from('proposals')
    .update({ status })
    .eq('id', id);

  if (error) throw error;
}