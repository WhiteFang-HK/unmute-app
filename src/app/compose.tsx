import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Chip, Empty, ErrorText, Field, Header, Screen, Small, Toggle, s } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { loadGroups } from '@/lib/data';
import { friendlyError, supabase } from '@/lib/supabase';
import { useLoad } from '@/lib/use-load';
import { C, F } from '@/theme';

export default function Compose() {
  const params = useLocalSearchParams<{ group?: string }>();
  const { session } = useAuth();
  const [group, setGroup] = useState<string | undefined>(params.group);
  const [body, setBody] = useState('');
  const [anon, setAnon] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const groups = useLoad(async () => (await loadGroups(session!.user.id)).filter((g) => g.my_status === 'approved'), []);

  async function post() {
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from('posts').insert({ group_id: group, body: body.trim(), is_anonymous: anon });
    setBusy(false);
    if (error) return setErr(friendlyError(error));
    router.back();
  }

  const joined = groups.data ?? [];
  return (
    <Screen footer={<Button label="Post" color={C.community} onPress={post} loading={busy} disabled={!group || body.trim().length < 2} />}>
      <Header icon="close" title="New post" />
      {groups.data && joined.length === 0 ? (
        <Empty icon="users" title="Join a group first" body="Posts live inside groups. Pick one from Community › Groups." />
      ) : (
        <View style={{ gap: 18, marginTop: 8 }}>
          <View style={{ gap: 8 }}>
            <Text style={s.label}>Post in</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {joined.map((g) => (
                <Chip key={g.id} label={g.name} selected={group === g.id} onPress={() => setGroup(g.id)} color={C.community} />
              ))}
            </View>
          </View>
          <Field
            label="What's on your mind?"
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={1500}
            placeholder="Share an experience, ask a question, mark a small win…"
            hint={`${body.length}/1500 · No legal documents, case details or children's names.`}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: C.surface }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text }}>Post anonymously</Text>
              <Small>Members won&apos;t see your name. Moderators still can, to keep everyone safe.</Small>
            </View>
            <Toggle value={anon} onChange={setAnon} color={C.community} label="Post anonymously" />
          </View>
          <ErrorText>{err ?? groups.error}</ErrorText>
        </View>
      )}
    </Screen>
  );
}
