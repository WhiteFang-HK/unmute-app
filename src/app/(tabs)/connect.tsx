import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colourFor } from '@/components/post-card';
import { Avatar, Button, Chip, Empty, ErrorText, Small, s } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { friendlyError, supabase } from '@/lib/supabase';
import { must, useLoad } from '@/lib/use-load';
import { C, F } from '@/theme';

type Person = {
  id: string;
  display_name: string;
  age_range: string | null;
  city: string | null;
  bio: string | null;
  interests: string[];
  shared_count?: number;
};

export default function Connect() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<'friendship' | 'dating'>(params.mode === 'dating' ? 'dating' : 'friendship');
  useEffect(() => {
    if (params.mode === 'dating') setMode('dating');
  }, [params.mode]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.ink }} edges={['top']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 34, letterSpacing: -1, color: C.text }}>
            Connect
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Friend requests"
            onPress={() => router.push('/requests')}
            style={{ height: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: C.border, justifyContent: 'center' }}>
            <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.friendship }}>Requests</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 12 }}>
          <Chip label="Friendship" selected={mode === 'friendship'} onPress={() => setMode('friendship')} color={C.friendship} />
          <Chip label="Dating" selected={mode === 'dating'} onPress={() => setMode('dating')} color={C.dating} />
        </View>
      </View>
      {mode === 'friendship' ? <Friends /> : <Dating />}
    </SafeAreaView>
  );
}

function PersonCard({ p, color, children }: { p: Person; color: string; children: React.ReactNode }) {
  return (
    <View style={{ padding: 16, borderRadius: 20, backgroundColor: C.surface, gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Avatar name={p.display_name} color={colourFor(p.display_name)} size={52} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.display, fontSize: 19, color: C.text }}>{p.display_name}</Text>
          <Small>{[p.age_range, p.city].filter(Boolean).join(' · ')}</Small>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Report ${p.display_name}`}
          hitSlop={10}
          onPress={() => router.push({ pathname: '/report', params: { user: p.id, name: p.display_name } })}>
          <Feather name="flag" size={17} color={C.muted} />
        </Pressable>
      </View>
      {p.bio ? <Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 21, color: C.softer }}>{p.bio}</Text> : null}
      {p.interests?.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {p.interests.slice(0, 6).map((i) => (
            <View key={i} style={{ paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: '#24212A', justifyContent: 'center' }}>
              <Text style={{ fontFamily: F.semi, fontSize: 12, color: color }}>{i}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {children}
    </View>
  );
}

function Friends() {
  const { profile } = useAuth();
  const list = useLoad(async () => must(await supabase.rpc('friend_suggestions', {})) as Person[], []);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);

  if (!profile?.friendship_on)
    return <Empty icon="smile" title="Friendship is off" body="Turn it on from Profile to meet people nearby." />;

  async function send(id: string) {
    setErr(null);
    const { error } = await supabase.rpc('send_friend_request', { p_to: id, p_note: note.trim() || null });
    if (error) return setErr(friendlyError(error));
    setNoteFor(null);
    setNote('');
    list.setData((list.data ?? []).filter((x) => x.id !== id));
  }

  return (
    <FlatList
      data={list.data ?? []}
      keyExtractor={(p) => p.id}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30, gap: 10 }}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={C.ember} />}
      ListHeaderComponent={<ErrorText>{err ?? list.error}</ErrorText>}
      renderItem={({ item: p }) => (
        <PersonCard p={p} color={C.friendship}>
          {p.shared_count ? <Small style={{ color: C.friendship }}>{p.shared_count} shared interests</Small> : null}
          {noteFor === p.id ? (
            <View style={{ gap: 8 }}>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Add a short hello (optional)"
                placeholderTextColor="#6E6962"
                maxLength={300}
                style={s.input}
                accessibilityLabel="Note"
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button label="Cancel" kind="secondary" style={{ flex: 1, height: 46 }} onPress={() => setNoteFor(null)} />
                <Button label="Send request" color={C.friendship} style={{ flex: 1, height: 46 }} onPress={() => send(p.id)} />
              </View>
            </View>
          ) : (
            <Button label="Say hi" color={C.friendship} style={{ height: 46 }} onPress={() => setNoteFor(p.id)} />
          )}
        </PersonCard>
      )}
      ListEmptyComponent={
        list.loaded ? <Empty icon="users" title="No new suggestions" body="As more members join, people who share your interests will show up here." /> : undefined
      }
    />
  );
}

function Dating() {
  const { profile } = useAuth();
  const list = useLoad(async () => (profile?.dating_on ? (must(await supabase.rpc('dating_suggestions', {})) as Person[]) : []), [profile?.dating_on]);
  const [err, setErr] = useState<string | null>(null);

  if (!profile?.dating_on)
    return (
      <View style={{ paddingHorizontal: 20, gap: 14 }}>
        <View style={{ padding: 18, borderRadius: 20, borderWidth: 1, borderColor: C.dating, gap: 10 }}>
          <Text style={{ fontFamily: F.display, fontSize: 24, color: C.dating }}>Dating is off.</Text>
          <Text style={{ fontFamily: F.body, fontSize: 15, lineHeight: 22, color: C.softer }}>
            It&apos;s optional, and only mutual matches can message. Read the dating policy to turn it on.
          </Text>
          <Button label="Read dating policy" color={C.dating} onPress={() => router.push('/dating-policy')} />
        </View>
      </View>
    );

  async function respond(p: Person, like: boolean) {
    setErr(null);
    list.setData((list.data ?? []).filter((x) => x.id !== p.id));
    const { data, error } = await supabase.rpc('dating_respond', { p_to: p.id, p_like: like });
    if (error) return setErr(friendlyError(error));
    if (data) {
      Alert.alert("It's a match", `You and ${p.display_name} both said yes.`, [
        { text: 'Later' },
        { text: 'Say hello', onPress: () => router.push({ pathname: '/chat/[id]', params: { id: data as string } }) },
      ]);
    }
  }

  return (
    <FlatList
      data={list.data ?? []}
      keyExtractor={(p) => p.id}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30, gap: 10 }}
      refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={C.ember} />}
      ListHeaderComponent={<ErrorText>{err ?? list.error}</ErrorText>}
      renderItem={({ item: p }) => (
        <PersonCard p={p} color={C.dating}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label="Pass" kind="secondary" style={{ flex: 1, height: 46 }} onPress={() => respond(p, false)} />
            <Button label="Interested" color={C.dating} style={{ flex: 1, height: 46 }} onPress={() => respond(p, true)} />
          </View>
        </PersonCard>
      )}
      ListEmptyComponent={
        list.loaded ? <Empty icon="heart" title="No one new right now" body="Check back later. Only people who have also opted in to dating appear here." /> : undefined
      }
    />
  );
}
