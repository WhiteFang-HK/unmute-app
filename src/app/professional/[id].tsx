import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Body, Button, Card, Chip, ErrorText, Field, Header, Loading, Screen, Small, s } from '@/components/ui';
import { friendlyError, supabase } from '@/lib/supabase';
import { must, useLoad } from '@/lib/use-load';
import { C, F } from '@/theme';

type Pro = { id: string; name: string; kind: string; city: string | null; languages: string[]; areas: string[]; fee_text: string | null; bio: string | null };

const MODES = ['Video call', 'Phone call', 'In person'];

export default function ProfessionalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pro = useLoad(async () => must(await supabase.from('professionals').select('*').eq('id', id).single()) as Pro, [id]);
  const [topic, setTopic] = useState<string | null>(null);
  const [mode, setMode] = useState(MODES[0]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!pro.loaded) return <Loading />;
  const p = pro.data;

  async function send() {
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from('enquiries').insert({ professional_id: id, topic, mode, note: note.trim() || null });
    setBusy(false);
    if (error) return setErr(friendlyError(error));
    setSent(true);
  }

  return (
    <Screen footer={!sent && p ? <Button label="Send enquiry" color={C.care} onPress={send} loading={busy} disabled={!topic} /> : undefined}>
      <Header eyebrow="Verified professional" tone={C.care} />
      <ErrorText>{pro.error}</ErrorText>
      {p ? (
        <View style={{ gap: 14, marginTop: 8 }}>
          <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 26, color: C.text }}>{p.name}</Text>
          <Small>{[p.city, p.languages.join(', '), p.fee_text].filter(Boolean).join(' · ')}</Small>
          {p.bio ? <Body>{p.bio}</Body> : null}
          {sent ? (
            <Card style={{ borderWidth: 1, borderColor: C.care }}>
              <Text style={{ fontFamily: F.bold, fontSize: 16, color: C.text }}>Enquiry sent.</Text>
              <Small style={{ marginTop: 4 }}>They&apos;ll reply by email. Nothing you share here is shown to other members.</Small>
            </Card>
          ) : (
            <>
              <Text style={s.label}>What would you like help with?</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {p.areas.map((a) => (
                  <Chip key={a} label={a} selected={topic === a} onPress={() => setTopic(a)} color={C.care} />
                ))}
                <Chip label="Something else" selected={topic === 'Other'} onPress={() => setTopic('Other')} color={C.care} />
              </View>
              <Text style={s.label}>How would you like to talk?</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {MODES.map((m) => (
                  <Chip key={m} label={m} selected={mode === m} onPress={() => setMode(m)} color={C.care} />
                ))}
              </View>
              <Field
                label="Short note (optional)"
                value={note}
                onChangeText={setNote}
                multiline
                maxLength={1000}
                hint="Don't include case numbers or documents here."
              />
              <ErrorText>{err}</ErrorText>
            </>
          )}
        </View>
      ) : null}
    </Screen>
  );
}
