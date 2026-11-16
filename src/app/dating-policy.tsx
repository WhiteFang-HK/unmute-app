import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Body, Button, ErrorText, Header, Screen, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { friendlyError, supabase } from '@/lib/supabase';
import { C, F } from '@/theme';

const RULES = [
  'Dating is only for members who are legally separated, divorced, or whose divorce proceedings are underway.',
  'Only mutual matches can message each other. No one can message you first.',
  'Never send money, OTPs or ID documents to anyone you meet here.',
  'Meet in a public place first, and tell someone you trust where you are.',
  'Report anything that feels wrong. Our team reviews every serious report.',
];

export default function DatingPolicy() {
  const { refreshProfile } = useAuth();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setErr(null);
    const { error } = await supabase.rpc('accept_dating_policy', { p_version: 'v1.0' });
    setBusy(false);
    if (error) return setErr(friendlyError(error));
    await refreshProfile();
    router.replace({ pathname: '/connect', params: { mode: 'dating' } });
  }

  return (
    <Screen footer={<Button label="Turn on dating" color={C.dating} onPress={accept} loading={busy} disabled={!agreed} />}>
      <Header eyebrow="Dating policy v1.0" tone={C.dating} />
      <Title style={{ marginTop: 8 }}>Before you turn on dating.</Title>
      <View style={{ gap: 12, marginTop: 18 }}>
        {RULES.map((r, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
            <Text style={{ fontFamily: F.display, fontSize: 18, color: C.dating, width: 18 }}>{i + 1}</Text>
            <Body style={{ flex: 1, fontSize: 15, lineHeight: 22 }}>{r}</Body>
          </View>
        ))}
      </View>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreed }}
        onPress={() => setAgreed(!agreed)}
        style={{ flexDirection: 'row', gap: 12, marginTop: 22, padding: 14, borderRadius: 16, backgroundColor: C.surface }}>
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: agreed ? C.dating : '#4A454C',
            backgroundColor: agreed ? C.dating : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {agreed ? <Text style={{ color: C.ink, fontFamily: F.heavy, fontSize: 13 }}>✓</Text> : null}
        </View>
        <Text style={{ flex: 1, fontFamily: F.semi, fontSize: 14, lineHeight: 20, color: C.text }}>
          I confirm I meet these conditions and agree to the dating policy.
        </Text>
      </Pressable>
      <View style={{ marginTop: 12 }}>
        <ErrorText>{err}</ErrorText>
      </View>
    </Screen>
  );
}
