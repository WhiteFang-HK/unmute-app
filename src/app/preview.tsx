import { Text, View } from 'react-native';

import { colourFor } from '@/components/post-card';
import { Avatar, Body, ErrorText, Header, Loading, Screen, Small } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { must, useLoad } from '@/lib/use-load';
import { C, F } from '@/theme';

type Card = { display_name: string; age_range: string | null; city: string | null; bio: string | null; interests: string[] };

// Shows your card exactly as other members see it in Friendship and Dating.
export default function Preview() {
  const card = useLoad(async () => (must(await supabase.rpc('my_public_card')) as Card[])[0] ?? null, []);
  if (!card.loaded) return <Loading />;
  const p = card.data;
  return (
    <Screen>
      <Header title="Preview as others" />
      <Body style={{ marginTop: 8 }}>This is what other members see when you appear in their suggestions.</Body>
      <ErrorText>{card.error}</ErrorText>
      {p ? (
        <View style={{ padding: 16, borderRadius: 20, backgroundColor: C.surface, gap: 10, marginTop: 16 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Avatar name={p.display_name} color={colourFor(p.display_name)} size={52} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.display, fontSize: 19, color: C.text }}>{p.display_name}</Text>
              <Small>{[p.age_range, p.city].filter(Boolean).join(' · ') || 'No age or city shown'}</Small>
            </View>
          </View>
          {p.bio ? <Text style={{ fontFamily: F.body, fontSize: 14, lineHeight: 21, color: C.softer }}>{p.bio}</Text> : null}
          {p.interests?.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {p.interests.map((i) => (
                <View key={i} style={{ paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: '#24212A', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: F.semi, fontSize: 12, color: C.friendship }}>{i}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
      <Small style={{ marginTop: 14 }}>Never shown: your real name, email, date of birth, relationship stage or CARE activity.</Small>
    </Screen>
  );
}
