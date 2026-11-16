import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Button, ErrorText, Header, Loading, Screen, Small, Toggle } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { pushStatus, registerForPush, type PushStatus } from '@/lib/push';
import { friendlyError, supabase } from '@/lib/supabase';
import { C, F } from '@/theme';

type Prefs = { friends: boolean; matches: boolean; messages: boolean; replies: boolean };
const DEFAULTS: Prefs = { friends: true, matches: true, messages: true, replies: true };

const ROWS: [keyof Prefs, string, string][] = [
  ['friends', 'Friend requests', 'New requests and accepted requests'],
  ['matches', 'Matches', 'When you both say yes in Dating'],
  ['messages', 'Messages', 'Friend, match and CARE chats'],
  ['replies', 'Replies on my posts', 'When someone replies in Community'],
];

const STATUS_TEXT: Record<PushStatus, string> = {
  on: 'Phone notifications are on for this device.',
  off: 'Phone notifications are off for this device.',
  denied: 'Notifications are blocked for UNMUTE in your phone settings. Turn them on there to get alerts.',
  unsupported: "Phone notifications aren't available here. You'll still see everything in the in-app list.",
  'needs-setup': "Phone notifications aren't switched on for this test version yet. You'll still see everything in the in-app list.",
};

export default function NotificationSettings() {
  const { session } = useAuth();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('notification_prefs')
      .select('friends, matches, messages, replies')
      .maybeSingle()
      .then(({ data }) => setPrefs((data as Prefs | null) ?? DEFAULTS));
    pushStatus().then(setStatus);
  }, []);

  async function set(key: keyof Prefs, v: boolean) {
    const next = { ...(prefs ?? DEFAULTS), [key]: v };
    setPrefs(next);
    setErr(null);
    const { error } = await supabase.from('notification_prefs').upsert({ user_id: session!.user.id, ...next });
    if (error) setErr(friendlyError(error));
  }

  async function turnOn() {
    setBusy(true);
    setStatus(await registerForPush(true));
    setBusy(false);
  }

  if (!prefs || !status) return <Loading />;

  return (
    <Screen>
      <Header title="Notifications" eyebrow="Settings" />
      <View style={{ padding: 14, borderRadius: 18, backgroundColor: C.surface, marginTop: 8, gap: 10 }}>
        <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text }}>On this phone</Text>
        <Small>{STATUS_TEXT[status]}</Small>
        {status === 'off' ? <Button label="Turn on phone notifications" onPress={turnOn} loading={busy} style={{ height: 44 }} /> : null}
        <Small style={{ fontSize: 12 }}>
          Alerts on your lock screen only ever say “UNMUTE” and a neutral line, like “You have a new message”. Never names or details.
        </Small>
      </View>

      <Text style={{ marginTop: 20, fontFamily: F.heavy, fontSize: 12, letterSpacing: 1.2, color: C.muted }}>SEND TO MY PHONE</Text>
      <View style={{ borderRadius: 18, backgroundColor: C.surface, paddingHorizontal: 14, marginTop: 8 }}>
        {ROWS.map(([key, name, sub]) => (
          <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text }}>{name}</Text>
              <Small style={{ fontSize: 12 }}>{sub}</Small>
            </View>
            <Toggle value={prefs[key]} onChange={(v) => set(key, v)} label={name} />
          </View>
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text }}>Safety and account</Text>
            <Small style={{ fontSize: 12 }}>Post reviews and appeal decisions. Always on.</Small>
          </View>
          <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.muted }}>On</Text>
        </View>
      </View>
      <Small style={{ marginTop: 10 }}>Switching a category off only stops phone alerts. You'll still find it in your notifications list.</Small>
      <ErrorText>{err}</ErrorText>
    </Screen>
  );
}
