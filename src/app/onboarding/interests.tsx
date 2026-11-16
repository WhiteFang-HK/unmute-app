import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Body, Button, Chip, ErrorText, Eyebrow, Loading, Screen, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { friendlyError, supabase } from '@/lib/supabase';
import { C } from '@/theme';

type Interest = { id: number; name: string };

export default function Interests() {
  const { refreshProfile } = useAuth();
  const [all, setAll] = useState<Interest[] | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('interests')
      .select('id, name')
      .order('id')
      .then(({ data, error: e }) => {
        if (e) setError(friendlyError(e));
        setAll((data as Interest[]) ?? []);
      });
  }, []);

  function toggle(id: number) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  async function next() {
    setBusy(true);
    const { error: e } = await supabase.rpc('set_interests', { p_ids: picked });
    setBusy(false);
    if (e) return setError(friendlyError(e));
    await refreshProfile();
    router.replace('/onboarding/pillars');
  }

  if (!all) return <Loading />;

  return (
    <Screen
      footer={
        <Button
          label={picked.length < 3 ? `Pick ${3 - picked.length} more` : `Continue with ${picked.length}`}
          onPress={next}
          loading={busy}
          disabled={picked.length < 3}
        />
      }>
      <View style={{ gap: 14 }}>
        <Eyebrow>Step 4 of 5</Eyebrow>
        <Title>What do you enjoy?</Title>
        <Body>Pick at least 3. We use these to suggest friends with something in common.</Body>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {all.map((i) => (
            <Chip key={i.id} label={i.name} selected={picked.includes(i.id)} onPress={() => toggle(i.id)} color={C.friendship} />
          ))}
        </View>
        <ErrorText>{error}</ErrorText>
      </View>
    </Screen>
  );
}
