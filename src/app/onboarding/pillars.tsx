import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Body, Button, ErrorText, Eyebrow, Screen, Small, Title, Toggle } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { friendlyError, supabase } from '@/lib/supabase';
import { C, F } from '@/theme';

export default function Pillars() {
  const { refreshProfile } = useAuth();
  const [community, setCommunity] = useState(true);
  const [friendship, setFriendship] = useState(true);
  const [care, setCare] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish() {
    setBusy(true);
    const { error: e } = await supabase.rpc('finish_onboarding', {
      p_community: community,
      p_friendship: friendship,
      p_care: care,
    });
    if (e) {
      setBusy(false);
      return setError(friendlyError(e));
    }
    await refreshProfile();
    router.replace('/');
  }

  const rows: [string, string, string, boolean, (v: boolean) => void][] = [
    ['Community', 'Groups and honest conversations with people who get it.', C.community, community, setCommunity],
    ['Friendship', 'Meet people nearby. No romance expected.', C.friendship, friendship, setFriendship],
    ['UNMUTE CARE', 'Vetted advocates and counsellors.', C.care, care, setCare],
  ];

  return (
    <Screen footer={<Button label="Enter UNMUTE" onPress={finish} loading={busy} />}>
      <View style={{ gap: 14 }}>
        <Eyebrow>Step 5 of 5</Eyebrow>
        <Title>What are you here for?</Title>
        <Body>Turn on only what feels right. You can change any of these later.</Body>
        <View style={{ gap: 10, marginTop: 4 }}>
          {rows.map(([name, desc, color, on, set]) => (
            <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: C.surface }}>
              <View style={{ width: 12, height: 44, borderRadius: 6, backgroundColor: color }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.display, fontSize: 19, color: C.text }}>{name}</Text>
                <Small style={{ marginTop: 2 }}>{desc}</Small>
              </View>
              <Toggle value={on} onChange={set} color={color} label={name} />
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: C.dating }}>
            <View style={{ width: 12, height: 44, borderRadius: 6, backgroundColor: C.dating }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.display, fontSize: 19, color: C.dating }}>Dating</Text>
              <Small style={{ marginTop: 2 }}>Off for now. Turn it on from Home after reading the dating policy.</Small>
            </View>
          </View>
        </View>
        <ErrorText>{error}</ErrorText>
      </View>
    </Screen>
  );
}
