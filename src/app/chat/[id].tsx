import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActionSheetIOS, Alert, FlatList, Platform, Pressable, Text, TextInput, View } from 'react-native';

import { Empty, ErrorText, Header, Loading, Screen, s, timeAgo } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import type { Convo } from '@/lib/data';
import { friendlyError, supabase } from '@/lib/supabase';
import { must, useLoad } from '@/lib/use-load';
import { C, F } from '@/theme';

type Msg = { id: string; sender_id: string; body: string; created_at: string; sender?: { display_name: string } | null };

const KIND_COLOUR = { group: C.community, friend: C.friendship, dating: C.dating, pro: C.care };

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const uid = session!.user.id;
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const listRef = useRef<FlatList<Msg>>(null);

  const convo = useLoad(async () => (must(await supabase.rpc('my_conversations')) as Convo[]).find((c) => c.id === id) ?? null, [id]);

  useEffect(() => {
    let alive = true;
    supabase
      .from('messages')
      .select('id, sender_id, body, created_at, sender:profiles(display_name)')
      .eq('conversation_id', id)
      .order('created_at')
      .limit(200)
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setErr(friendlyError(error));
        setMsgs((data as unknown as Msg[]) ?? []);
      });
    supabase.rpc('mark_read', { p_conversation: id });

    // Live updates: new messages appear without refreshing.
    const channel = supabase
      .channel(`chat:${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, (payload) => {
        const m = payload.new as Msg;
        setMsgs((cur) => (cur && !cur.some((x) => x.id === m.id) ? [...cur, m] : cur));
        supabase.rpc('mark_read', { p_conversation: id });
      })
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [id]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setText('');
    setErr(null);
    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: id, body })
      .select('id, sender_id, body, created_at')
      .single();
    if (error) {
      setText(body);
      return setErr(error.message.includes('row-level') ? "This chat is closed, so you can't send messages." : friendlyError(error));
    }
    setMsgs((cur) => (cur && !cur.some((x) => x.id === data.id) ? [...cur, data as Msg] : cur));
  }

  const c = convo.data;
  const oneToOne = c && c.kind !== 'group' && c.other_id;

  function openMenu() {
    if (!c || !c.other_id) return;
    const other = c.other_id;
    const actions: [string, () => void][] = [
      ['Report', () => router.push({ pathname: '/report', params: { user: other, name: c.title } })],
      [
        'Block',
        () =>
          Alert.alert(`Block ${c.title}?`, "They won't be able to see you or message you. They won't be told.", [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Block',
              style: 'destructive',
              onPress: async () => {
                await supabase.rpc('block_user', { p_target: other });
                router.back();
              },
            },
          ]),
      ],
    ];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...actions.map((a) => a[0]), 'Cancel'], cancelButtonIndex: actions.length, destructiveButtonIndex: 1 },
        (i) => actions[i]?.[1](),
      );
    } else {
      Alert.alert(c.title, undefined, [...actions.map(([t, f]) => ({ text: t, onPress: f })), { text: 'Cancel', style: 'cancel' as const }]);
    }
  }

  if (!msgs || !convo.loaded) return <Loading />;

  const tone = c ? KIND_COLOUR[c.kind] : C.ember;

  return (
    <Screen
      scroll={false}
      padded={false}
      footer={
        <View style={{ gap: 6 }}>
          <ErrorText>{err}</ErrorText>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Message"
              placeholderTextColor="#6E6962"
              accessibilityLabel="Message"
              multiline
              maxLength={2000}
              style={[s.input, { flex: 1, height: undefined, minHeight: 48, maxHeight: 120, paddingTop: 13 }]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send"
              onPress={send}
              disabled={!text.trim()}
              style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: text.trim() ? tone : C.surface, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="send" size={18} color={text.trim() ? C.ink : C.muted} />
            </Pressable>
          </View>
        </View>
      }>
      <Header
        title={c?.title ?? 'Chat'}
        eyebrow={c ? { group: 'Group chat', friend: 'Friendship', dating: 'Dating match', pro: 'CARE' }[c.kind] : undefined}
        tone={tone}
        right={
          oneToOne ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Safety options" onPress={openMenu} hitSlop={8}>
              <Feather name="shield" size={20} color={C.text} />
            </Pressable>
          ) : undefined
        }
      />
      <FlatList
        ref={listRef}
        data={msgs}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListHeaderComponent={
          c?.kind === 'dating' || c?.kind === 'friend' ? (
            <Text style={[s.small, { textAlign: 'center', marginBottom: 8 }]}>
              Never share money, OTPs or ID. Tap the shield to report or block.
            </Text>
          ) : undefined
        }
        ListEmptyComponent={<Empty icon="message-circle" title="Say hello" body="Keep it kind. You can report or block any time." />}
        renderItem={({ item: m }) => {
          const mine = m.sender_id === uid;
          return (
            <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              {!mine && c?.kind === 'group' && m.sender?.display_name ? (
                <Text style={{ fontFamily: F.bold, fontSize: 12, color: tone, marginBottom: 2, marginLeft: 4 }}>{m.sender.display_name}</Text>
              ) : null}
              <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, backgroundColor: mine ? tone : C.surface }}>
                <Text style={{ fontFamily: F.body, fontSize: 15, lineHeight: 21, color: mine ? C.ink : C.text }}>{m.body}</Text>
              </View>
              <Text style={{ fontFamily: F.body, fontSize: 11, color: C.muted, marginTop: 2, alignSelf: mine ? 'flex-end' : 'flex-start', marginHorizontal: 4 }}>
                {timeAgo(m.created_at)}
              </Text>
            </View>
          );
        }}
      />
    </Screen>
  );
}
