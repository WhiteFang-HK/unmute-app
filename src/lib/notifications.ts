// In-app notifications (US-M16-01): unread count that updates live.
import { useEffect, useState } from 'react';

import { useAuth } from './auth';
import { supabase } from './supabase';

export type Notice = {
  id: string;
  kind: string;
  category: string;
  title: string;
  body: string | null;
  link: string | null;
  count: number;
  read_at: string | null;
  created_at: string;
};

export function useUnreadCount() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    const refresh = () =>
      supabase.rpc('unread_notification_count').then(({ data }) => {
        if (alive && typeof data === 'number') setCount(data);
      });
    refresh();
    const channel = supabase
      .channel(`notices:${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` }, refresh)
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [uid]);

  return count;
}
