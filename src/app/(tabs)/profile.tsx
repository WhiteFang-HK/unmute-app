import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colourFor } from '@/components/post-card';
import { Avatar, ErrorText, Screen, Small, Toggle } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { friendlyError, supabase } from '@/lib/supabase';
import { C, F, type Pillar } from '@/theme';

export default function Profile() {
  const { profile, refreshProfile, signOut } = useAuth();
  const [err, setErr] = useState<string | null>(null);
  if (!profile) return null;

  async function setPillar(p: Pillar, on: boolean) {
    setErr(null);
    if (p === 'dating' && on) return router.push('/dating-policy');
    const { error } = await supabase.rpc('set_pillar', { p_pillar: p, p_on: on });
    if (error) setErr(friendlyError(error));
    await refreshProfile();
  }

  async function setPaused(v: boolean) {
    await supabase.from('profiles').update({ discovery_paused: v }).eq('id', profile!.id);
    await refreshProfile();
  }

  const rows: [Pillar, string, string, string, boolean][] = [
    ['community', 'Community', 'Groups, posts and replies', C.community, profile.community_on],
    ['friendship', 'Friendship discovery', 'Show me to people nearby', C.friendship, profile.friendship_on],
    ['dating', 'Dating discovery', profile.dating_on ? 'Mutual matches only' : 'Off. Existing chats stay open.', C.dating, profile.dating_on],
    ['care', 'UNMUTE CARE', 'Articles and verified professionals', C.care, profile.care_on],
  ];

  const links: [string, string, () => void, string?][] = [
    ['Edit profile', '', () => router.push('/edit-profile')],
    ['Privacy & visibility', '', () => router.push('/privacy')],
    ['Blocked members', '', () => router.push('/blocked')],
    ['Notifications', '', () => router.push('/notification-settings')],
    ['Welcome tour', 'Replay', () => router.push('/tour')],
    ['UNMUTE CARE', 'Open', () => router.push('/care'), C.care],
  ];
  if (profile.role === 'admin' || profile.role === 'moderator') {
    links.push(['Moderation', 'Staff only', () => router.push('/admin'), C.ember]);
  }

  return (
    <Screen edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Avatar name={profile.display_name} color={colourFor(profile.display_name)} size={72} />
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 26, letterSpacing: -0.6, color: C.text }}>
            {profile.display_name}
          </Text>
          <Small>{[profile.age_range, profile.city, profile.language === 'hi' ? 'हिन्दी' : 'English'].filter(Boolean).join(' · ')}</Small>
        </View>
      </View>
      {profile.bio ? <Text style={{ marginTop: 12, fontFamily: F.body, fontSize: 15, lineHeight: 22, color: C.softer }}>{profile.bio}</Text> : null}

      <Text style={label}>WHAT YOU TAKE PART IN</Text>
      <View style={{ borderRadius: 18, backgroundColor: C.surface, paddingHorizontal: 14, marginTop: 8 }}>
        {rows.map(([key, name, sub, color, on], i) => (
          <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderBottomColor: C.line }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text }}>{name}</Text>
              <Small style={{ fontSize: 12 }}>{sub}</Small>
            </View>
            <Toggle value={on} onChange={(v) => setPillar(key, v)} color={color} label={name} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: C.surface, marginTop: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text }}>Take a break</Text>
          <Small style={{ fontSize: 12 }}>Hide me from friend and dating suggestions</Small>
        </View>
        <Toggle value={profile.discovery_paused} onChange={setPaused} label="Take a break" />
      </View>
      <ErrorText>{err}</ErrorText>

      <Text style={label}>PRIVACY &amp; SAFETY</Text>
      <View style={{ borderRadius: 18, backgroundColor: C.surface, paddingHorizontal: 14, marginTop: 8 }}>
        <View style={rowStyle}>
          <Text style={rowText}>Relationship stage</Text>
          <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.friendship }}>Private</Text>
        </View>
        <View style={rowStyle}>
          <Text style={rowText}>Date of birth</Text>
          <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.friendship }}>Private · age range shown</Text>
        </View>
        {links.map(([t, sub, go, color], i) => (
          <Pressable key={t} accessibilityRole="button" onPress={go} style={[rowStyle, i === links.length - 1 && { borderBottomWidth: 0 }]}>
            <Text style={rowText}>{t}</Text>
            {sub ? <Text style={{ fontFamily: F.bold, fontSize: 13, color: color ?? C.muted }}>{sub}</Text> : <Feather name="chevron-right" size={18} color={C.muted} />}
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
        <Pressable accessibilityRole="button" onPress={signOut}>
          <Text style={{ fontFamily: F.bold, fontSize: 14, color: C.soft }}>Sign out</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/delete-account')}>
          <Text style={{ fontFamily: F.bold, fontSize: 14, color: C.emberLight }}>Delete account</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const label = { marginTop: 20, fontFamily: F.heavy, fontSize: 12, letterSpacing: 1.2, color: C.muted } as const;
const rowStyle = { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 50, borderBottomWidth: 1, borderBottomColor: C.line } as const;
const rowText = { fontFamily: F.semi, fontSize: 15, color: C.text } as const;
