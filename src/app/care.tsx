import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Body, Chip, Empty, ErrorText, Header, Screen, Small, Title } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { must, useLoad } from '@/lib/use-load';
import { C, F } from '@/theme';

type Article = { id: string; title: string; stage: string; minutes: number };
type Pro = { id: string; name: string; kind: string; city: string | null; languages: string[]; areas: string[]; fee_text: string | null };

const STAGES = [
  ['all', 'All'],
  ['deciding', 'Deciding'],
  ['preparing', 'Preparing'],
  ['underway', 'Underway'],
  ['after', 'After'],
] as const;
const KIND = { advocate: 'Family-law advocate', counsellor: 'Counsellor', psychologist: 'Psychologist' } as Record<string, string>;

export default function Care() {
  const [stage, setStage] = useState('all');
  const articles = useLoad(async () => must(await supabase.from('articles').select('id, title, stage, minutes').order('title')) as Article[], []);
  const pros = useLoad(async () => must(await supabase.from('professionals').select('id, name, kind, city, languages, areas, fee_text').order('kind')) as Pro[], []);
  const shown = (articles.data ?? []).filter((a) => stage === 'all' || a.stage === stage);

  return (
    <Screen>
      <Header eyebrow="UNMUTE CARE" tone={C.care} />
      <Title style={{ marginTop: 6 }}>Clarity, privately.</Title>
      <Body style={{ marginTop: 10 }}>Plain-language guides, and verified advocates and counsellors you can contact directly.</Body>
      <View style={{ marginTop: 10, padding: 12, borderRadius: 14, backgroundColor: '#1D1A26' }}>
        <Small style={{ color: C.care }}>
          General information, not legal advice. For your situation, speak to a professional.
        </Small>
      </View>

      <Text style={sectionLabel}>GUIDES</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {STAGES.map(([v, l]) => (
          <Chip key={v} label={l} selected={stage === v} onPress={() => setStage(v)} color={C.care} />
        ))}
      </View>
      <ErrorText>{articles.error ?? pros.error}</ErrorText>
      <View style={{ gap: 8, marginTop: 10 }}>
        {shown.map((a) => (
          <Pressable
            key={a.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/article/[id]', params: { id: a.id } })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: C.surface }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 15, lineHeight: 20, color: C.text }}>{a.title}</Text>
              <Small style={{ marginTop: 2 }}>{a.minutes} min read</Small>
            </View>
            <Feather name="chevron-right" size={18} color={C.muted} />
          </Pressable>
        ))}
        {articles.loaded && shown.length === 0 ? <Empty icon="book-open" title="No guides for this stage yet" /> : null}
      </View>

      <Text style={sectionLabel}>PROFESSIONALS</Text>
      <View style={{ gap: 8, marginTop: 8 }}>
        {(pros.data ?? []).map((p) => (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/professional/[id]', params: { id: p.id } })}
            style={{ padding: 14, borderRadius: 16, backgroundColor: C.surface, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ flex: 1, fontFamily: F.bold, fontSize: 15, color: C.text }}>{p.name}</Text>
              <Feather name="check-circle" size={14} color={C.care} />
            </View>
            <Small>{[KIND[p.kind] ?? p.kind, p.city, p.languages.join(', ')].filter(Boolean).join(' · ')}</Small>
            <Small style={{ color: C.softer }}>{p.areas.join(' · ')}</Small>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const sectionLabel = { marginTop: 24, fontFamily: F.heavy, fontSize: 12, letterSpacing: 1.2, color: C.muted } as const;
