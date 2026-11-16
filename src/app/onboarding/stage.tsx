import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Body, Button, ErrorText, Eyebrow, Screen, Small, Title } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { friendlyError, supabase } from '@/lib/supabase';
import { C, F } from '@/theme';

const STAGES = [
  ['thinking', 'Thinking about separation or divorce'],
  ['considering', 'Considering my options'],
  ['preparing', 'Preparing for proceedings'],
  ['underway', 'Divorce proceedings underway'],
  ['separated', 'Separated'],
  ['divorced', 'Divorced'],
  ['prefer_not', 'Prefer not to say'],
] as const;

export default function Stage() {
  const { refreshProfile } = useAuth();
  const [stage, setStage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function next() {
    setBusy(true);
    const { error: e } = await supabase.rpc('set_stage', { p_stage: stage });
    setBusy(false);
    if (e) return setError(friendlyError(e));
    await refreshProfile();
    router.replace('/onboarding/interests');
  }

  return (
    <Screen footer={<Button label="Continue" onPress={next} loading={busy} disabled={!stage} />}>
      <View style={{ gap: 14 }}>
        <Eyebrow>Step 3 of 5</Eyebrow>
        <Title>Where are you right now?</Title>
        <Small style={{ color: C.friendship }}>Private. Never shown on your profile.</Small>
        <View accessibilityRole="radiogroup" style={{ gap: 8, marginTop: 4 }}>
          {STAGES.map(([v, label]) => {
            const on = stage === v;
            return (
              <Pressable
                key={v}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => setStage(v)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  minHeight: 52,
                  paddingHorizontal: 16,
                  borderRadius: 14,
                  backgroundColor: C.surface,
                  borderWidth: 1,
                  borderColor: on ? C.ember : C.line,
                }}>
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    borderWidth: on ? 5 : 2,
                    borderColor: on ? C.ember : '#4A454C',
                    backgroundColor: C.ink,
                  }}
                />
                <Text style={{ flex: 1, fontFamily: on ? F.bold : F.semi, fontSize: 15, color: C.text }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Body style={{ fontSize: 14, lineHeight: 21, color: C.muted }}>
          This only helps us suggest the right groups and resources. You can change it anytime. Dating opens only for
          members who are separated, divorced, or whose divorce is underway.
        </Body>
        <ErrorText>{error}</ErrorText>
      </View>
    </Screen>
  );
}
