import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';

import { PostCard, colourFor, type FeedPost } from '@/components/post-card';
import { Avatar, Empty, ErrorText, Header, Loading, Screen, s, timeAgo } from '@/components/ui';
import { friendlyError, supabase } from '@/lib/supabase';
import { must, useLoad } from '@/lib/use-load';
import { C, F } from '@/theme';

type Comment = { id: string; body: string; created_at: string; author_name: string | null; is_mine: boolean; is_op: boolean };

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const post = useLoad(async () => (must(await supabase.rpc('feed', { p_post: id, p_limit: 1 })) as FeedPost[])[0] ?? null, [id]);
  const comments = useLoad(
    async () =>
      must(await supabase.rpc('post_comments', { p_post: id })) as Comment[],
    [id],
  );

  async function send() {
    if (!text.trim()) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from('comments').insert({ post_id: id, body: text.trim() });
    setBusy(false);
    if (error) return setErr(error.message.includes('row-level') ? 'Join this group to reply.' : friendlyError(error));
    setText('');
    comments.reload();
    post.reload();
  }

  async function removePost() {
    await supabase.from('posts').delete().eq('id', id);
    router.back();
  }

  if (!post.loaded) return <Loading />;
  if (!post.data)
    return (
      <Screen>
        <Header />
        <Empty icon="eye-off" title="This post isn't available" body="It may have been removed." />
      </Screen>
    );

  return (
    <Screen
      scroll={false}
      padded={false}
      footer={
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Write a kind reply…"
            placeholderTextColor="#6E6962"
            accessibilityLabel="Reply"
            multiline
            maxLength={1000}
            style={[s.input, { flex: 1, height: undefined, minHeight: 48, maxHeight: 120, paddingTop: 13 }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send reply"
            disabled={busy || !text.trim()}
            onPress={send}
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: text.trim() ? C.community : C.surface, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="send" size={18} color={text.trim() ? C.ink : C.muted} />
          </Pressable>
        </View>
      }>
      <Header title={post.data.group_name} tone={C.community} right={post.data.is_mine ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Delete my post" onPress={removePost} hitSlop={8}>
          <Feather name="trash-2" size={19} color={C.muted} />
        </Pressable>
      ) : undefined} />
      <FlatList
        data={comments.data ?? []}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 20, gap: 14 }}
        ListHeaderComponent={
          <View style={{ paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.line, gap: 6 }}>
            <PostCard post={post.data} full />
            <ErrorText>{err}</ErrorText>
          </View>
        }
        renderItem={({ item: c }) => (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {c.author_name ? (
              <Avatar name={c.author_name} color={colourFor(c.author_name)} size={32} />
            ) : (
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#4A454C', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: F.display, fontSize: 14, color: C.text }}>?</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 14, color: C.text }}>
                {c.is_mine ? 'You' : c.author_name ?? 'Anonymous member'}
                {c.is_op ? <Text style={{ fontFamily: F.bold, fontSize: 12, color: C.community }}> · Original poster</Text> : null}{' '}
                <Text style={{ fontFamily: F.body, fontSize: 12, color: C.muted }}>· {timeAgo(c.created_at)}</Text>
              </Text>
              <Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 21, color: C.softer, marginTop: 2 }}>{c.body}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={comments.data ? <Text style={[s.small, { textAlign: 'center' }]}>No replies yet.</Text> : undefined}
      />
    </Screen>
  );
}
