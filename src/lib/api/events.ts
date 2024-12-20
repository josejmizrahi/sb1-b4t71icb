import { supabase } from '../supabase';
import type { Event, EventWithAttendees } from '@/types/events';

export async function getEvents() {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      attendees:event_attendees(
        profile:profiles(id, display_name, avatar_url),
        status
      )
    `)
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data as EventWithAttendees[];
}

export async function getEvent(id: string) {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      attendees:event_attendees(
        profile:profiles(id, display_name, avatar_url),
        status
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as EventWithAttendees;
}

export async function createEvent(event: Partial<Event>) {
  const { data, error } = await supabase
    .from('events')
    .insert(event)
    .select()
    .single();

  if (error) throw error;
  return data as Event;
}

export async function joinEvent(eventId: string, userId: string) {
  const { error } = await supabase
    .from('event_attendees')
    .insert({
      event_id: eventId,
      profile_id: userId,
      status: 'attending'
    });

  if (error) throw error;
}

export async function leaveEvent(eventId: string, userId: string) {
  const { error } = await supabase
    .from('event_attendees')
    .update({ status: 'cancelled' })
    .eq('event_id', eventId)
    .eq('profile_id', userId);

  if (error) throw error;
}