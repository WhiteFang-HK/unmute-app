import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Body, Button, Card, ErrorText, Field, Header, Screen, Small, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { friendlyError, supabase } from '@/lib/supabase';
import { C } from '@/theme';

export default function DeleteAccount() {
  const { signOut } = useAuth();
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setErr(null);
    const { error } = await supabase.rpc('delete_my_account', { p_confirm: confirm.trim().toUpperCase() });
    setBusy(false);
    if (error) return setErr(friendlyError(error));
    await signOut();
  }

  return (
    <Screen
      footer={
        <View style={{ gap: 10 }}>
          <Button label="Delete my account" onPress={remove} loading={busy} disabled={confirm.trim().toUpperCase() !== 'DELETE'} />
          <Button label="Keep my account" kind="secondary" onPress={() => router.back()} />
        </View>
      }>
      <Header icon="close" />
      <Title style={{ marginTop: 8 }}>Delete your account?</Title>
      <Body style={{ marginTop: 12 }}>This can't be undone. We'll permanently remove:</Body>
      <Card style={{ marginTop: 12, gap: 6 }}>
        <Body style={{ fontSize: 15 }}>• Your profile, interests and private details</Body>
        <Body style={{ fontSize: 15 }}>• Your posts, replies and reactions</Body>
        <Body style={{ fontSize: 15 }}>• Your chats, friend connections and matches</Body>
        <Body style={{ fontSize: 15 }}>• Your CARE enquiries and mood check-ins</Body>
      </Card>
      <Small style={{ marginTop: 12 }}>
        Want a copy first? Go back and use "Download my data". If you just need space, "Take a break" hides you without deleting anything.
      </Small>
      <View style={{ marginTop: 18, gap: 8 }}>
        <Field label='Type DELETE to confirm' value={confirm} onChangeText={setConfirm} autoCapitalize="characters" placeholder="DELETE" />
        <ErrorText>{err}</ErrorText>
      </View>
      <Small style={{ marginTop: 8, color: C.muted }}>A record that an account was deleted (with no personal details) is kept for safety audits.</Small>
    </Screen>
  );
}
