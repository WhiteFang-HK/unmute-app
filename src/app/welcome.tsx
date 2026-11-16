import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Body, Button, Logo, Screen, Small } from '@/components/ui';
import { C, F } from '@/theme';

const PILLARS = [
  ['Community', C.community],
  ['Friendship', C.friendship],
  ['Dating', C.dating],
  ['Care', C.care],
] as const;

export default function Welcome() {
  return (
    <Screen
      footer={
        <>
          <Button label="Create account" onPress={() => router.push({ pathname: '/sign-in', params: { mode: 'create' } })} />
          <Button label="I already have an account" kind="secondary" onPress={() => router.push({ pathname: '/sign-in', params: { mode: 'signin' } })} />
          <Small style={{ textAlign: 'center' }}>Your legal name is never shown. You choose what members see.</Small>
        </>
      }>
      <Logo size={22} />
      <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 32 }}>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: F.display, fontSize: 52, lineHeight: 52, letterSpacing: -2, color: C.text }}>
          Divorced.{'\n'}Not{'\n'}
          <Text style={{ color: C.ember }}>discontinued.</Text>
        </Text>
        <Body style={{ marginTop: 18 }}>
          Your story. Your people. Your next chapter. A private place for adults 30+ to talk, make friends, date again
          or get proper guidance.
        </Body>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 22 }}>
          {PILLARS.map(([label, color]) => (
            <View key={label} style={{ paddingHorizontal: 14, height: 34, borderRadius: 17, backgroundColor: color, justifyContent: 'center' }}>
              <Text style={{ fontFamily: F.bold, fontSize: 14, color: C.ink }}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}
