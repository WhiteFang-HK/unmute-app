import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Body, Button, ErrorText, Eyebrow, Field, Header, Screen, Title } from '@/components/ui';
import { friendlyError, supabase } from '@/lib/supabase';
import { C, F } from '@/theme';

export default function Verify() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(30);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function verify() {
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' });
    setBusy(false);
    if (e) return setError(e.message.includes('expired') || e.message.includes('invalid') ? 'That code is wrong or has expired.' : friendlyError(e));
    router.replace('/');
  }

  async function resend() {
    setError(null);
    const { error: e } = await supabase.auth.signInWithOtp({ email });
    if (e) setError(friendlyError(e));
    else setWait(60);
  }

  return (
    <Screen footer={<Button label="Verify & continue" onPress={verify} loading={busy} disabled={code.trim().length < 6} />}>
      <Header back />
      <View style={{ gap: 14, marginTop: 12 }}>
        <Eyebrow>Step 1 of 5</Eyebrow>
        <Title>Enter the code we just sent.</Title>
        <Body>Sent to {email}. Check spam if it isn&apos;t there in a minute.</Body>
        <Field
          label="Code"
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 8))}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          placeholder="••••••"
          maxLength={8}
          autoFocus
        />
        <ErrorText>{error}</ErrorText>
        <Pressable accessibilityRole="button" disabled={wait > 0} onPress={resend}>
          <Text style={{ fontFamily: F.semi, fontSize: 14, color: wait > 0 ? C.muted : C.ember }}>
            {wait > 0 ? `Resend code in 0:${String(wait).padStart(2, '0')}` : 'Resend code'}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
