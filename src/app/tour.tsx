import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { C, F } from '@/theme';

type IconName = React.ComponentProps<typeof Feather>['name'];

const CARDS: { icon: IconName; colour: string; eyebrow: string; title: string; body: string; points: string[] }[] = [
  {
    icon: 'users',
    colour: C.community,
    eyebrow: 'Community',
    title: 'Be heard, your way.',
    body: 'Join groups of people who get it. Share with your name, or anonymously.',
    points: ['Read each group’s rules before joining', 'Anonymous posts hide your name from members', 'Your first posts get a quick check by our team'],
  },
  {
    icon: 'heart',
    colour: C.friendship,
    eyebrow: 'Connect',
    title: 'Friends first. Dating only if you want.',
    body: 'Friendship and Dating are separate, and both are off until you turn them on.',
    points: ['Nobody can message you out of the blue', 'Chats open only after a request is accepted or you both say yes', 'Take a break any time to hide from suggestions'],
  },
  {
    icon: 'life-buoy',
    colour: C.care,
    eyebrow: 'UNMUTE CARE',
    title: 'Clarity, privately.',
    body: 'Read trusted guides and reach verified lawyers and counsellors.',
    points: ['Your CARE activity is never used for matching', 'Private notes only you can read', 'Information here is not legal or medical advice'],
  },
  {
    icon: 'shield',
    colour: C.ember,
    eyebrow: 'Your safety',
    title: 'You stay in control.',
    body: 'Your relationship stage and date of birth are never shown to anyone.',
    points: ['Tap the shield in any chat to report or block', 'Blocking is silent. They aren’t told', 'Download or delete your data from Profile'],
  },
];

export default function Tour() {
  const { profile, refreshProfile } = useAuth();
  const [i, setI] = useState(0);
  const card = CARDS[i];
  const last = i === CARDS.length - 1;

  async function finish() {
    if (profile && !profile.tour_seen) {
      await supabase.from('profiles').update({ tour_seen: true }).eq('id', profile.id);
      await refreshProfile();
    }
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  }

  return (
    <Screen
      footer={
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }} accessibilityLabel={`Card ${i + 1} of ${CARDS.length}`}>
            {CARDS.map((c, k) => (
              <View key={c.eyebrow} style={{ width: k === i ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: k === i ? card.colour : C.line }} />
            ))}
          </View>
          <Button label={last ? 'Get started' : 'Next'} color={card.colour} onPress={() => (last ? finish() : setI(i + 1))} />
        </View>
      }>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 }}>
        {i > 0 ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Previous" onPress={() => setI(i - 1)} hitSlop={8}>
            <Feather name="arrow-left" size={20} color={C.text} />
          </Pressable>
        ) : (
          <View />
        )}
        <Pressable accessibilityRole="button" onPress={finish} hitSlop={8}>
          <Text style={{ fontFamily: F.bold, fontSize: 14, color: C.soft }}>Skip</Text>
        </Pressable>
      </View>

      <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: card.colour, alignItems: 'center', justifyContent: 'center', marginTop: 24 }}>
        <Feather name={card.icon} size={32} color={C.ink} />
      </View>
      <Text style={{ marginTop: 22, fontFamily: F.heavy, fontSize: 12, letterSpacing: 1.4, color: card.colour }}>{card.eyebrow.toUpperCase()}</Text>
      <Text accessibilityRole="header" style={{ marginTop: 8, fontFamily: F.display, fontSize: 32, lineHeight: 36, letterSpacing: -0.8, color: C.text }}>
        {card.title}
      </Text>
      <Text style={{ marginTop: 12, fontFamily: F.body, fontSize: 16, lineHeight: 24, color: C.softer }}>{card.body}</Text>
      <View style={{ marginTop: 20, gap: 12 }}>
        {card.points.map((p) => (
          <View key={p} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <Feather name="check" size={17} color={card.colour} style={{ marginTop: 2 }} />
            <Text style={{ flex: 1, fontFamily: F.semi, fontSize: 15, lineHeight: 22, color: C.text }}>{p}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}
