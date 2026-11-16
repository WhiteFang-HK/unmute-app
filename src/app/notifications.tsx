import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Empty, ErrorText, Header, Loading, Screen, Small, timeAgo } from '@/components/ui';
import type { Notice } from '@/lib/notifications';
import { friendlyError, supabase } from '@/lib/supabase';
import { C, F } from '@/theme';

type IconName = React.ComponentProps<typeof Feather>['name'];

const LOOK: Record<string, [IconName, string]> = {
  friend_request: ['user-plus', C.friendship],
  friend_accepted: ['user-check', C.friendship],
  match: ['heart', C.dating],
  message: ['message-circle', C.ember],
  reply: ['corner-down-right', C.community],
  post_approved: ['check-circle', C.community],
  post_removed: ['alert-circle', C.emberLight],
  appeal: ['shield', C.care],
};

export default function Notifications() {
  const [items, setItems] = useState<Notice[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, kind, category, title, body, link, count, read_at, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) setErr(friendlyError(error));
    setItems((data as Notice[]) ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function open(n: Notice) {
    if (!n.read_at) {
      setItems((cur) => cur?.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)) ?? null);
      await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', n.id);
    }
    if (n.link) router.push(n.link as never);
  }

  async function markAll() {
    await supabase.rpc('mark_all_notifications_read');
    load();
  }

  if (!items) return <Loading />;
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <Screen>
      <Header
        title="Notifications"
        right={
          <Pressable accessibilityRole="button" accessibilityLabel="Notification settings" hitSlop={8} onPress={() => router.push('/notification-settings')}>
            <Feather name="settings" size={19} color={C.text} />
          </Pressable>
        }
      />
      {unread > 0 ? (
        <Pressable accessibilityRole="button" onPress={markAll} style={{ alignSelf: 'flex-end', paddingVertical: 6 }}>
          <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.ember }}>Mark all read</Text>
        </Pressable>
      ) : null}
      <ErrorText>{err}</ErrorText>
      <View style={{ gap: 8, marginTop: 6 }}>
        {items.map((n) => {
          const [icon, colour] = LOOK[n.kind] ?? ['bell', C.ember];
          const extra = n.count > 1 ? (n.kind === 'message' ? ` · ${n.count} new messages` : ` · ${n.count} replies`) : '';
          return (
            <Pressable
              key={n.id}
              accessibilityRole="button"
              accessibilityLabel={`${n.read_at ? '' : 'Unread. '}${n.title}`}
              onPress={() => open(n)}
              style={{
                flexDirection: 'row',
                gap: 12,
                padding: 14,
                borderRadius: 16,
                backgroundColor: n.read_at ? 'transparent' : C.surface,
                borderWidth: 1,
                borderColor: n.read_at ? C.line : 'transparent',
              }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colour, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name={icon} size={17} color={C.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: n.read_at ? F.semi : F.bold, fontSize: 15, color: C.text }}>{n.title}</Text>
                {n.body ? (
                  <Text numberOfLines={2} style={{ fontFamily: F.body, fontSize: 13, lineHeight: 19, color: C.softer, marginTop: 2 }}>
                    {n.body}
                  </Text>
                ) : null}
                <Small style={{ fontSize: 12, marginTop: 4 }}>
                  {timeAgo(n.created_at)}
                  {extra}
                </Small>
              </View>
              {!n.read_at ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.ember, marginTop: 6 }} /> : null}
            </Pressable>
          );
        })}
      </View>
      {items.length === 0 ? <Empty icon="bell" title="Nothing yet" body="Friend requests, matches, messages and replies will show up here." /> : null}
    </Screen>
  );
}
