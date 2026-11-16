import { router } from 'expo-router';
import { FlatList, Text, View } from 'react-native';

import { colourFor } from '@/components/post-card';
import { Avatar, Button, Empty, ErrorText, Header, Screen, Small, timeAgo } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { friendlyError, supabase } from '@/lib/supabase';
import { must, useLoad } from '@/lib/use-load';
import { C, F } from '@/theme';

type Req = {
  id: string;
  note: string | null;
  created_at: string;
  from: { display_name: string; public_age_range: string | null; public_city: string | null } | null;
};

export default function Requests() {
  const { session } = useAuth();
  const list = useLoad(
    async () =>
      must(
        await supabase
          .from('friend_requests')
          .select('id, note, created_at, from:profiles!friend_requests_from_id_fkey(display_name, public_age_range, public_city)')
          .eq('to_id', session!.user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
      ) as unknown as Req[],
    [],
  );

  async function respond(id: string, accept: boolean) {
    const { data, error } = await supabase.rpc('respond_friend_request', { p_request: id, p_accept: accept });
    if (error) return list.setData(list.data);
    list.setData((list.data ?? []).filter((r) => r.id !== id));
    if (accept && data) router.push({ pathname: '/chat/[id]', params: { id: data as string } });
  }

  return (
    <Screen scroll={false} padded={false}>
      <Header title="Friendship requests" tone={C.friendship} />
      <FlatList
        data={(list.data ?? []).filter((r) => r.from)}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 20, gap: 10 }}
        ListHeaderComponent={<ErrorText>{list.error ? friendlyError(list.error) : undefined}</ErrorText>}
        renderItem={({ item: r }) => (
          <View style={{ padding: 16, borderRadius: 20, backgroundColor: C.surface, gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Avatar name={r.from!.display_name} color={colourFor(r.from!.display_name)} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.bold, fontSize: 16, color: C.text }}>{r.from!.display_name}</Text>
                <Small>{[r.from!.public_age_range, r.from!.public_city, timeAgo(r.created_at)].filter(Boolean).join(' · ')}</Small>
              </View>
            </View>
            {r.note ? <Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 21, color: C.softer }}>“{r.note}”</Text> : null}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button label="Not now" kind="secondary" style={{ flex: 1, height: 46 }} onPress={() => respond(r.id, false)} />
              <Button label="Accept" color={C.friendship} style={{ flex: 1, height: 46 }} onPress={() => respond(r.id, true)} />
            </View>
          </View>
        )}
        ListEmptyComponent={list.loaded ? <Empty icon="user-plus" title="No requests right now" /> : undefined}
      />
    </Screen>
  );
}
