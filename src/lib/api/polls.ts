import { supabase } from '../supabase';
import type { Poll, PollWithOptions, PollVote } from '@/types/polls';

export async function getPolls() {
  const { data: polls, error: pollsError } = await supabase
    .from('polls')
    .select(`
      *,
      creator:profiles!creator_id(
        display_name,
        avatar_url
      ),
      options:poll_options(*)
    `)
    .order('created_at', { ascending: false });

  if (pollsError) throw pollsError;

  // Get vote counts for each option
  const pollsWithVotes = await Promise.all(polls.map(async (poll) => {
    const { data: results } = await supabase
      .rpc('get_poll_results', { poll_id: poll.id });

    const options = poll.options.map(option => ({
      ...option,
      vote_count: results?.find(r => r.option_id === option.id)?.vote_count || 0
    }));

    const total_votes = options.reduce((sum, opt) => sum + opt.vote_count, 0);

    return {
      ...poll,
      options,
      total_votes
    };
  }));

  return pollsWithVotes as PollWithOptions[];
}

export async function createPoll(
  poll: Pick<Poll, 'title' | 'description' | 'expiry_date' | 'allow_multiple_votes'>,
  options: string[]
) {
  const { data: newPoll, error: pollError } = await supabase
    .from('polls')
    .insert({
      creator_id: (await supabase.auth.getUser()).data.user?.id,
      title: poll.title,
      description: poll.description,
      expiry_date: poll.expiry_date,
      allow_multiple_votes: poll.allow_multiple_votes
    })
    .select()
    .single();

  if (pollError) throw pollError;

  const { error: optionsError } = await supabase
    .from('poll_options')
    .insert(
      options.map(text => ({
        poll_id: newPoll.id,
        text
      }))
    );

  if (optionsError) throw optionsError;

  return newPoll;
}

export async function vote(pollId: string, optionId: string) {
  const { error } = await supabase
    .from('poll_votes')
    .insert({
      poll_id: pollId,
      option_id: optionId,
      voter_id: (await supabase.auth.getUser()).data.user?.id
    });

  if (error) throw error;
}