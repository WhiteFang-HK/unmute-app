import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';

import { Body, ErrorText, Header, Screen, Small, Toggle } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { friendlyError, supabase } from '@/lib/supabase';
import { C, F } from '@/theme';

// "Who can see my profile" + preview + data rights.
export default function Privacy() {
  const { profile, refreshProfile } = useAuth();
  const [err, setErr] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  if (!profile) return null;

  async function set(field: 'show_age' | 'show_city' | 'discovery_paused', value: boolean) {
    setErr(null);
    const { error } = await supabase.from('profiles').update({ [field]: value }).eq('id', profile!.id);
    if (error) setErr(friendlyError(error));
    await refreshProfile();
  }

  async function exportData() {
    setExporting(true);
    setErr(null);
    const { data, error } = await supabase.rpc('export_my_data');
    setExporting(false);
    if (error) return setErr(friendlyError(error));
    try {
      await Share.share({ title: 'My UNMUTE data', message: JSON.stringify(data, null, 2) });
    } catch {
      setErr("Couldn't open the share sheet on this device.");
    }
  }

  const rows: [string, string, boolean, (v: boolean) => void][] = [
    ['Show my age range', `Members see "${profile.age_range ?? '—'}". Your date of birth is never shown.`, profile.show_age, (v) => set('show_age', v)],
    ['Show my city', `Members see "${profile.city ?? '—'}".`, profile.show_city, (v) => set('show_city', v)],
    ['Take a break', 'Hide me from friend and dating suggestions. Existing chats stay open.', profile.discovery_paused, (v) => set('discovery_paused', v)],
  ];

  return (
    <Screen>
      <Header title="Privacy & visibility" />
      <Body style={{ marginTop: 8 }}>
        Only signed-in UNMUTE members aged 30+ can see profiles. Your relationship stage, date of birth and email are
        never shown to anyone.
      </Body>

      <View style={{ borderRadius: 18, backgroundColor: C.surface, paddingHorizontal: 14, marginTop: 16 }}>
        {rows.map(([title, sub, on, change], i) => (
          <View
            key={title}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderBottomColor: C.line }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text }}>{title}</Text>
              <Small style={{ fontSize: 12, marginTop: 2 }}>{sub}</Small>
            </View>
            <Toggle value={on} onChange={change} label={title} />
          </View>
        ))}
      </View>
      <ErrorText>{err}</ErrorText>

      <View style={{ borderRadius: 18, backgroundColor: C.surface, paddingHorizontal: 14, marginTop: 16 }}>
        <LinkRow icon="eye" title="Preview as others" sub="See exactly what other members see" onPress={() => router.push('/preview')} />
        <LinkRow
          icon="download"
          title={exporting ? 'Preparing your data…' : 'Download my data'}
          sub="Everything UNMUTE holds about you, as a file you can save"
          onPress={exportData}
        />
        <LinkRow icon="trash-2" title="Delete my account" sub="Permanently remove your account and data" danger onPress={() => router.push('/delete-account')} last />
      </View>
    </Screen>
  );
}

function LinkRow({
  icon,
  title,
  sub,
  onPress,
  danger,
  last,
}: {
  icon: 'eye' | 'download' | 'trash-2';
  title: string;
  sub: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: last ? 0 : 1, borderBottomColor: C.line }}>
      <Feather name={icon} size={18} color={danger ? C.emberLight : C.soft} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.bold, fontSize: 15, color: danger ? C.emberLight : C.text }}>{title}</Text>
        <Small style={{ fontSize: 12, marginTop: 2 }}>{sub}</Small>
      </View>
      <Feather name="chevron-right" size={18} color={C.muted} />
    </Pressable>
  );
}
