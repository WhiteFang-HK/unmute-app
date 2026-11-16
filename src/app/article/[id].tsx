import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { ErrorText, Header, Loading, Screen, Small } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { must, useLoad } from '@/lib/use-load';
import { C, F } from '@/theme';

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const a = useLoad(async () => must(await supabase.from('articles').select('title, minutes, body').eq('id', id).single()) as { title: string; minutes: number; body: string }, [id]);
  if (!a.loaded) return <Loading />;
  return (
    <Screen>
      <Header eyebrow="CARE guide" tone={C.care} />
      <ErrorText>{a.error}</ErrorText>
      {a.data ? (
        <>
          <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 28, lineHeight: 32, color: C.text, marginTop: 8 }}>
            {a.data.title}
          </Text>
          <Small style={{ marginTop: 8 }}>{a.data.minutes} min read · General information, not legal advice.</Small>
          <Text style={{ fontFamily: F.body, fontSize: 16, lineHeight: 26, color: C.softer, marginTop: 18 }}>{a.data.body}</Text>
        </>
      ) : null}
    </Screen>
  );
}
