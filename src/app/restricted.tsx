import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Body, Button, Card, ErrorText, Field, Header, Loading, Screen, Small, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { friendlyError, supabase } from '@/lib/supabase';
import { must, useLoad } from '@/lib/use-load';
import { C, F } from '@/theme';

type Restriction = { status: string; reason: string | null; since: string | null; appeal_status: string | null };

// Shown to suspended members (instead of the app) and to restricted members (from a Home banner).
export default function Restricted() {
  const { profile, signOut } = useAuth();
  const info = useLoad(async () => (must(await supabase.rpc('my_restriction')) as Restriction[])[0] ?? null, []);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!info.loaded) return <Loading />;
  const r = info.data;
  const suspended = r?.status === 'suspended';
  const active = r?.status === 'active';

  async function appeal() {
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from('appeals').insert({ message: message.trim() });
    setBusy(false);
    if (error) return setErr(error.message.includes('row-level') ? 'You already have an appeal waiting for review.' : friendlyError(error));
    setMessage('');
    info.reload();
  }

  return (
    <Screen
      footer={
        suspended ? (
          <Button label="Sign out" kind="secondary" onPress={signOut} />
        ) : (
          <Button label="Back to UNMUTE" kind="secondary" onPress={() => router.replace('/')} />
        )
      }>
      {suspended ? null : <Header />}
      <View style={{ gap: 14, marginTop: suspended ? 32 : 8 }}>
        <Title>
          {active ? 'Your account is in good standing.' : suspended ? 'Your account is suspended.' : 'Your account is limited.'}
        </Title>
        {!active ? (
          <Body>
            {suspended
              ? "While it's suspended you can't use UNMUTE. If you think this is a mistake, you can ask us to review it."
              : "You can still read and browse, but you can't post, reply or message for now."}
          </Body>
        ) : null}
        {r?.reason && !active ? (
          <Card style={{ gap: 4 }}>
            <Text style={{ fontFamily: F.heavy, fontSize: 12, letterSpacing: 1.2, color: C.ember }}>REASON GIVEN</Text>
            <Text style={{ fontFamily: F.semi, fontSize: 15, color: C.text }}>{r.reason}</Text>
            {r.since ? <Small>Since {new Date(r.since).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Small> : null}
          </Card>
        ) : null}

        {r?.appeal_status === 'open' ? (
          <Card style={{ borderWidth: 1, borderColor: C.line }}>
            <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text }}>Your appeal is with our team.</Text>
            <Small style={{ marginTop: 4 }}>We review appeals within 48 hours. You don't need to do anything else.</Small>
          </Card>
        ) : r?.appeal_status === 'rejected' && !active ? (
          <Card style={{ borderWidth: 1, borderColor: C.line }}>
            <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text }}>Your last appeal wasn't accepted.</Text>
            <Small style={{ marginTop: 4 }}>You can send a new one with any information we may have missed.</Small>
          </Card>
        ) : null}

        {!active && r?.appeal_status !== 'open' ? (
          <View style={{ gap: 10 }}>
            <Field
              label="Ask for a review"
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={2000}
              placeholder="Tell us what happened, in your own words."
              hint="A person on our team reads every appeal."
            />
            <Button label="Send appeal" onPress={appeal} loading={busy} disabled={message.trim().length < 10} />
            <ErrorText>{err ?? info.error}</ErrorText>
          </View>
        ) : null}
        <Small>Signed in as {profile?.display_name}.</Small>
      </View>
    </Screen>
  );
}
