import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Text, View } from 'react-native';

import { PostCard, type FeedPost } from '@/components/post-card';
import { Body, Button, Card, Empty, ErrorText, Header, Loading, Screen, Small } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { friendlyError, supabase } from '@/lib/supabase';
import { must, useLoad } from '@/lib/use-load';
import { C, F } from '@/theme';

type Group = {
  id: string;
  name: string;
  description: string;
  access: 'open' | 'restricted';
  rules: string[];
  group_members: { user_id: string; status: string }[];
};

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const uid = session!.user.id;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const group = useLoad(
    async () => must(await supabase.from('groups').select('id, name, description, access, rules, group_members(user_id, status)').eq('id', id).single()) as Group,
    [id],
  );
  const posts = useLoad(async () => must(await supabase.rpc('feed', { p_group: id })) as FeedPost[], [id]);

  if (!group.data) return group.error ? <Screen><Header /><ErrorText>{group.error}</ErrorText></Screen> : <Loading />;
  const g = group.data;
  const mine = g.group_members.find((m) => m.user_id === uid)?.status;
  const count = g.group_members.filter((m) => m.status === 'approved').length;

  async function join() {
    setBusy(true);
    setErr(null);
    const { error } = await supabase.rpc('join_group', { p_group: id });
    setBusy(false);
    if (error) return setErr(friendlyError(error));
    group.reload();
    posts.reload();
  }
  async function leave() {
    setBusy(true);
    await supabase.rpc('leave_group', { p_group: id });
    setBusy(false);
    group.reload();
  }

  const groupChat = async () => {
    const { data } = await supabase.from('conversations').select('id').eq('group_id', id).eq('kind', 'group').maybeSingle();
    if (data) router.push({ pathname: '/chat/[id]', params: { id: data.id } });
  };

  const canSee = g.access === 'open' || mine === 'approved';

  return (
    <Screen scroll={false} padded={false}>
      <Header title={g.name} eyebrow={g.access === 'restricted' ? 'Members-only group' : 'Open group'} tone={C.community} />
      <FlatList
        data={canSee ? posts.data ?? [] : []}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 20, gap: 10 }}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 8 }}>
            <Body>{g.description}</Body>
            <Small>
              {count} {count === 1 ? 'member' : 'members'}
            </Small>
            <Card style={{ gap: 6 }}>
              <Text style={{ fontFamily: F.heavy, fontSize: 12, letterSpacing: 1.2, color: C.community }}>GROUP RULES</Text>
              {g.rules.map((r, i) => (
                <Text key={i} style={{ fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.softer }}>
                  {i + 1}. {r}
                </Text>
              ))}
            </Card>
            {mine === 'approved' ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button label="Write a post" color={C.community} style={{ flex: 1 }} onPress={() => router.push({ pathname: '/compose', params: { group: id } })} />
                <Button label="Group chat" kind="secondary" style={{ flex: 1 }} onPress={groupChat} />
              </View>
            ) : mine === 'pending' ? (
              <Card style={{ borderWidth: 1, borderColor: C.line }}>
                <Body style={{ fontSize: 14 }}>Request sent. A moderator will review it soon.</Body>
              </Card>
            ) : (
              <Button
                label={g.access === 'open' ? 'Join group' : 'Request to join'}
                color={C.community}
                loading={busy}
                onPress={join}
              />
            )}
            <ErrorText>{err ?? posts.error}</ErrorText>
          </View>
        }
        renderItem={({ item }) => <PostCard post={item} showGroup={false} />}
        ListEmptyComponent={
          canSee ? (
            posts.data ? <Empty icon="message-square" title="No posts yet" body="Start the conversation." /> : undefined
          ) : (
            <Empty icon="lock" title="Posts are for members" body="Request to join to read and post here." />
          )
        }
        ListFooterComponent={
          mine === 'approved' ? (
            <Button label="Leave group" kind="ghost" onPress={leave} loading={busy} style={{ marginTop: 16 }} />
          ) : undefined
        }
      />
    </Screen>
  );
}
