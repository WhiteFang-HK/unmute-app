import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Body, Button, ErrorText, Eyebrow, Field, Header, Screen, Small, Title } from '@/components/ui';
import { friendlyError, supabase } from '@/lib/supabase';
import { C, F } from '@/theme';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = /^\S+@\S+\.\S+$/.test(email.trim());

  async function send() {
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (e) return setError(friendlyError(e));
    router.push({ pathname: '/verify', params: { email: email.trim().toLowerCase() } });
  }

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={<Button label="Send my code" onPress={send} loading={busy} disabled={!valid || !agreed} />}>
      <Header back />
      <View style={{ gap: 14, marginTop: 12 }}>
        <Eyebrow>Step 1 of 5</Eyebrow>
        <Title>What&apos;s your email?</Title>
        <Body>We&apos;ll send a one-time code. No passwords to remember.</Body>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@example.com"
          returnKeyType="send"
          onSubmitEditing={() => valid && agreed && send()}
        />
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}
          onPress={() => setAgreed(!agreed)}
          style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: 4 }}>
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              borderWidth: 2,
              borderColor: agreed ? C.ember : '#4A454C',
              backgroundColor: agreed ? C.ember : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 1,
            }}>
            {agreed ? <Text style={{ color: C.ink, fontFamily: F.heavy, fontSize: 13 }}>✓</Text> : null}
          </View>
          <Text style={{ flex: 1, fontFamily: F.body, fontSize: 14, lineHeight: 21, color: C.softer }}>
            I accept the Terms and Privacy notice. I understand UNMUTE is for adults aged 30 and above.
          </Text>
        </Pressable>
        <ErrorText>{error}</ErrorText>
        <Small>Your email is only used to keep accounts accountable. Never shown.</Small>
      </View>
    </Screen>
  );
}
