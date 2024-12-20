import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';

export function useUnreadMessages() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchUnreadCount();

    // Subscribe to changes
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

    async function fetchUnreadCount() {
      const { data, error } = await supabase
        .rpc('get_unread_messages_count', {
          profile_uuid: user.id
        });

      if (!error) {
        setUnreadCount(data || 0);
      }
    }
  }, [user]);

  return { unreadCount };
}