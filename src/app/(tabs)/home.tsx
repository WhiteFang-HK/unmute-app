import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Card, Logo, Screen, Small } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { C, F } from '@/theme';

const MOODS = ['Heavy', 'Low', 'Okay', 'Lighter', 'Good'];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
}

export default function Home() {
  const { profile } = useAuth();
  const [mood, setMood] = useState<number | null>(null);

  async function pickMood(i: number) {
    setMood(i);
    await supabase.from('mood_checkins').insert({ mood: i + 1 });
  }

  const first = (profile?.display_name ?? '').split(/[_ .-]/)[0];

  const tiles = [
    {
      title: 'Community',
      sub: profile?.community_on ? 'Groups and honest conversations' : 'Off. Turn on in Profile.',
      bg: C.community,
      go: () => router.push('/community'),
    },
    {
      title: 'Friendship',
      sub: profile?.friendship_on ? `People in ${profile?.city ?? 'your city'} who share your interests` : 'Off. Turn on in Profile.',
      bg: C.friendship,
      go: () => router.push('/connect'),
    },
    {
      title: 'Dating',
      sub: profile?.dating_on ? 'Mutual matches only' : "Off for now. Turn on whenever you're ready.",
      bg: profile?.dating_on ? C.dating : null,
      go: () => (profile?.dating_on ? router.push({ pathname: '/connect', params: { mode: 'dating' } }) : router.push('/dating-policy')),
    },
    {
      title: 'CARE',
      sub: 'Legal clarity & counselling, privately',
      bg: C.care,
      go: () => router.push('/care'),
    },
  ];

  return (
    <Screen edges={['top']}>
      <Logo />
      <Text accessibilityRole="header" style={{ marginTop: 18, fontFamily: F.display, fontSize: 34, lineHeight: 36, letterSpacing: -1, color: C.text }}>
        {greeting()}, {first || 'friend'}.
      </Text>

      {profile?.status === 'restricted' ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/restricted')}
          style={{ marginTop: 14, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: C.ember, backgroundColor: '#2A1712' }}>
          <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text }}>Your account is limited</Text>
          <Text style={{ fontFamily: F.body, fontSize: 13, color: C.softer, marginTop: 2 }}>
            You can browse, but not post or message. Tap to see why or ask for a review.
          </Text>
        </Pressable>
      ) : null}

      <Card style={{ marginTop: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text }}>How&apos;s today feeling?</Text>
          <Small style={{ fontSize: 12 }}>Only you see this</Small>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
          {MOODS.map((m, i) => {
            const on = mood === i;
            return (
              <Pressable
                key={m}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => pickMood(i)}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: on ? C.text : C.border,
                  backgroundColor: on ? C.text : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text style={{ fontFamily: on ? F.bold : F.semi, fontSize: 12, color: on ? C.ink : C.softer }}>{m}</Text>
              </Pressable>
            );
          })}
        </View>
        {mood !== null ? <Small style={{ marginTop: 10 }}>Saved. Be gentle with yourself today.</Small> : null}
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
        {tiles.map((t) => (
          <Pressable
            key={t.title}
            accessibilityRole="button"
            onPress={t.go}
            style={{
              width: '48.5%',
              height: 118,
              padding: 14,
              borderRadius: 20,
              justifyContent: 'space-between',
              backgroundColor: t.bg ?? C.surface,
              borderWidth: t.bg ? 0 : 1,
              borderColor: C.dating,
            }}>
            <Text style={{ fontFamily: F.display, fontSize: 20, color: t.bg ? C.ink : C.dating }}>{t.title}</Text>
            <Text style={{ fontFamily: F.semi, fontSize: 13, lineHeight: 17, color: t.bg ? C.ink : C.softer }}>{t.sub}</Text>
          </Pressable>
        ))}
      </View>

      <Card style={{ marginTop: 12, borderWidth: 1, borderColor: C.line, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: F.heavy, fontSize: 12, letterSpacing: 1.2, color: C.ember }}>PLOT TWIST · THIS WEEK</Text>
        </View>
        <Text style={{ fontFamily: F.display, fontSize: 21, lineHeight: 24, color: C.text }}>
          Cook one dish you&apos;ve never made just for yourself.
        </Text>
        <Link href="/community" style={{ fontFamily: F.semi, fontSize: 13, color: C.soft }}>
          Share it in Community, or don&apos;t.
        </Link>
      </Card>
    </Screen>
  );
}
