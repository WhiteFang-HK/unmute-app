import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Body, Button, ErrorText, Eyebrow, Field, Header, Screen, Small, Title } from '@/components/ui';
import { friendlyError, supabase } from '@/lib/supabase';
import { C, F } from '@/theme';

// POC sign-in: email + password (no email sending needed on Supabase's free plan).
// Switch back to one-time email codes once a custom email sender is set up.
export default function SignIn() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<'create' | 'signin'>(params.mode === 'signin' ? 'signin' : 'create');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const creating = mode === 'create';
  const valid = /^\S+@\S+\.\S+$/.test(email.trim()) && password.length >= 8 && (!creating || agreed);

  async function go() {
    setBusy(true);
    setError(null);
    const e = email.trim().toLowerCase();
    const { data, error: err } = creating
      ? await supabase.auth.signUp({ email: e, password })
      : await supabase.auth.signInWithPassword({ email: e, password });
    setBusy(false);
    if (err) {
      if (err.message.includes('already registered')) return setError('You already have an account. Switch to "Sign in" below.');
      if (err.message.includes('Invalid login')) return setError('Email or password is wrong.');
      return setError(friendlyError(err));
    }
    if (!data.session) return setError('Account created. Please sign in.');
    router.replace('/');
  }

  return (
    <Screen footer={<Button label={creating ? 'Create my account' : 'Sign in'} onPress={go} loading={busy} disabled={!valid} />}>
      <Header back />
      <View style={{ gap: 14, marginTop: 12 }}>
        <Eyebrow>{creating ? 'Step 1 of 5' : 'Welcome back'}</Eyebrow>
        <Title>{creating ? 'Create your account.' : 'Sign in.'}</Title>
        <Body>{creating ? 'Your email is never shown to other members.' : 'Use the email and password you signed up with.'}</Body>
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={creating ? 'new-password' : 'current-password'}
          placeholder="At least 8 characters"
          onSubmitEditing={() => valid && go()}
        />
        {creating ? (
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
        ) : null}
        <ErrorText>{error}</ErrorText>
        <Pressable accessibilityRole="button" onPress={() => { setMode(creating ? 'signin' : 'create'); setError(null); }}>
          <Text style={{ fontFamily: F.semi, fontSize: 14, color: C.ember }}>
            {creating ? 'I already have an account' : "I'm new here. Create an account"}
          </Text>
        </Pressable>
        <Small>Your email is only used to keep accounts accountable. Never shown.</Small>
      </View>
    </Screen>
  );
}
