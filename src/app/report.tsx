import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Body, Button, ErrorText, Field, Header, Screen, Small, Title } from '@/components/ui';
import { friendlyError, supabase } from '@/lib/supabase';
import { C, F } from '@/theme';

const REASONS = [
  ['harassment', 'Harassment or bullying'],
  ['money', 'Asking for money or a scam'],
  ['sexual', 'Unwanted sexual content'],
  ['fake', 'Fake profile'],
  ['threats', 'Threats or violence'],
  ['private_info', "Sharing someone's private information"],
  ['underage', 'Seems under 30'],
  ['other', 'Something else'],
] as const;

export default function Report() {
  const { user, post, message, name } = useLocalSearchParams<{ user?: string; post?: string; message?: string; name?: string }>();
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from('reports').insert({
      reported_user_id: user ?? null,
      post_id: post ?? null,
      message_id: message ?? null,
      reason,
      details: details.trim() || null,
    });
    setBusy(false);
    if (error) return setErr(friendlyError(error));
    setDone(true);
  }

  if (done)
    return (
      <Screen footer={<Button label="Done" onPress={() => router.back()} />}>
        <Header icon="close" />
        <Title style={{ marginTop: 24 }}>Thank you. We&apos;ve got it.</Title>
        <Body style={{ marginTop: 14 }}>
          Our team reviews every report. The person won&apos;t know who reported them. If you feel unsafe right now, call
          112.
        </Body>
        {user ? (
          <Button
            label={`Also block ${name ?? 'this member'}`}
            kind="secondary"
            style={{ marginTop: 20 }}
            onPress={async () => {
              await supabase.rpc('block_user', { p_target: user });
              router.back();
            }}
          />
        ) : null}
      </Screen>
    );

  return (
    <Screen footer={<Button label="Send report" onPress={submit} loading={busy} disabled={!reason} />}>
      <Header icon="close" title={post ? 'Report post' : `Report ${name ?? 'member'}`} />
      <Small style={{ marginTop: 6 }}>What&apos;s going on? Your report is private.</Small>
      <View accessibilityRole="radiogroup" style={{ gap: 8, marginTop: 14 }}>
        {REASONS.map(([v, l]) => {
          const on = reason === v;
          return (
            <Pressable
              key={v}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => setReason(v)}
              style={{ minHeight: 50, paddingHorizontal: 16, borderRadius: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: on ? C.ember : C.line, justifyContent: 'center' }}>
              <Text style={{ fontFamily: on ? F.bold : F.semi, fontSize: 15, color: C.text }}>{l}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ marginTop: 16, gap: 8 }}>
        <Field label="Anything else? (optional)" value={details} onChangeText={setDetails} multiline maxLength={2000} />
        <ErrorText>{err}</ErrorText>
      </View>
    </Screen>
  );
}
