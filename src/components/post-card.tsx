import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Avatar, timeAgo } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { C, F } from '@/theme';

export type FeedPost = {
  id: string;
  group_id: string;
  group_name: string;
  body: string;
  is_anonymous: boolean;
  author_name: string | null;
  is_mine: boolean;
  review_state: string;
  created_at: string;
  strength_count: number;
  been_there_count: number;
  comment_count: number;
  my_strength: boolean;
  my_been_there: boolean;
};

const PALETTE = [C.community, C.friendship, C.care, C.dating];
export function colourFor(name?: string | null) {
  if (!name) return '#4A454C';
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function PostCard({ post, full, showGroup = true }: { post: FeedPost; full?: boolean; showGroup?: boolean }) {
  const [p, setP] = useState(post);
  const name = p.is_anonymous ? (p.is_mine ? 'You (anonymous)' : 'Anonymous member') : p.author_name;

  async function react(kind: 'strength' | 'been_there') {
    const mineKey = kind === 'strength' ? 'my_strength' : 'my_been_there';
    const countKey = kind === 'strength' ? 'strength_count' : 'been_there_count';
    const on = !p[mineKey];
    setP({ ...p, [mineKey]: on, [countKey]: Number(p[countKey]) + (on ? 1 : -1) });
    if (on) await supabase.from('reactions').insert({ post_id: p.id, kind });
    else await supabase.from('reactions').delete().match({ post_id: p.id, kind });
  }

  const header = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {p.is_anonymous ? (
          <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#4A454C', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: F.display, fontSize: 16, color: C.text }}>?</Text>
          </View>
        ) : (
          <Avatar name={p.author_name} color={colourFor(p.author_name)} size={38} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text }}>{name}</Text>
          <Text style={{ fontFamily: F.body, fontSize: 12, color: C.muted }}>
            {showGroup ? `${p.group_name} · ` : ''}
            {timeAgo(p.created_at)}
            {p.review_state !== 'published' ? ` · ${p.review_state === 'pending' ? 'Waiting for review' : 'Hidden by moderators'}` : ''}
          </Text>
        </View>
      </View>
      <Text style={{ fontFamily: F.body, fontSize: 15, lineHeight: 22, color: C.softer, marginTop: 10 }} numberOfLines={full ? undefined : 6}>
        {p.body}
      </Text>
    </>
  );

  const actions = (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' }}>
      <ReactBtn label="Strength" n={p.strength_count} on={p.my_strength} onPress={() => react('strength')} />
      <ReactBtn label="Been there" n={p.been_there_count} on={p.my_been_there} onPress={() => react('been_there')} />
      <Text style={{ marginLeft: 'auto', fontFamily: F.semi, fontSize: 13, color: C.muted }}>
        {p.comment_count} {Number(p.comment_count) === 1 ? 'reply' : 'replies'}
      </Text>
    </View>
  );

  const report = !p.is_mine ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Report post"
      hitSlop={10}
      onPress={() => router.push({ pathname: '/report', params: { post: p.id } })}
      style={{ position: 'absolute', top: full ? 4 : 16, right: full ? 0 : 16, padding: 4 }}>
      <Feather name="more-horizontal" size={20} color={C.muted} />
    </Pressable>
  ) : null;

  if (full)
    return (
      <View style={{ paddingVertical: 4 }}>
        {header}
        {actions}
        {report}
      </View>
    );
  return (
    <View style={{ padding: 16, borderRadius: 20, backgroundColor: C.surface }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open post"
        onPress={() => router.push({ pathname: '/post/[id]', params: { id: p.id } })}
        style={{ paddingRight: 28 }}>
        {header}
      </Pressable>
      {actions}
      {report}
    </View>
  );
}

function ReactBtn({ label, n, on, onPress }: { label: string; n: number; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={{
        height: 34,
        paddingHorizontal: 12,
        borderRadius: 17,
        borderWidth: 1,
        borderColor: on ? C.community : C.border,
        backgroundColor: on ? 'rgba(255,181,71,0.14)' : 'transparent',
        justifyContent: 'center',
      }}>
      <Text style={{ fontFamily: F.bold, fontSize: 13, color: on ? C.community : C.softer }}>
        {label} · {n}
      </Text>
    </Pressable>
  );
}
