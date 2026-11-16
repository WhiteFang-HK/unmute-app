import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Chip, Empty, ErrorText, timeAgo } from '@/components/ui';
import type { Convo } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { must, useLoad } from '@/lib/use-load';
import { C, F } from '@/theme';


const KIND_COLOUR = { group: C.community, friend: C.friendship, dating: C.dating, pro: C.care };
const FILTERS = [
  ['all', 'All', C.ember],
  ['group', 'Community', C.community],
  ['friend', 'Friendship', C.friendship],
  ['dating', 'Dating', C.dating],
] as const;

export default function Inbox() {
  const [filter, setFilter] = useState<string>('all');
  const list = useLoad(async () => must(await supabase.rpc('my_conversations')) as Convo[], []);
  const rows = (list.data ?? []).filter((c) => filter === 'all' || c.kind === filter);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.ink }} edges={['top']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 34, letterSpacing: -1, color: C.text }}>
          Inbox
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, marginBottom: 6 }}>
          {FILTERS.map(([v, l, c]) => (
            <Chip key={v} label={l} selected={filter === v} onPress={() => setFilter(v)} color={c} />
          ))}
        </View>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={C.ember} />}
        ListHeaderComponent={<ErrorText>{list.error}</ErrorText>}
        renderItem={({ item: c }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/chat/[id]', params: { id: c.id } })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1F1C21' }}>
            <Avatar name={c.title} color={KIND_COLOUR[c.kind]} />
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text, flexShrink: 1 }} numberOfLines={1}>
                  {c.title}
                  <Text style={{ fontFamily: F.semi, fontSize: 12, color: KIND_COLOUR[c.kind] }}>
                    {'  '}
                    {{ group: 'Group', friend: 'Friend', dating: 'Match', pro: 'CARE' }[c.kind]}
                  </Text>
                </Text>
                <Text style={{ fontFamily: F.body, fontSize: 12, color: C.muted }}>{timeAgo(c.last_at)}</Text>
              </View>
              <Text
                numberOfLines={1}
                style={{ fontFamily: c.unread ? F.semi : F.body, fontSize: 14, color: c.unread ? '#E6E1DA' : C.muted }}>
                {c.last_body ?? (c.kind === 'dating' ? 'You matched. Say hello when ready.' : 'No messages yet')}
              </Text>
            </View>
            {c.unread ? <View accessibilityLabel="Unread" style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.ember }} /> : null}
          </Pressable>
        )}
        ListEmptyComponent={
          list.loaded ? (
            <Empty
              icon="message-circle"
              title="Nothing here yet"
              body="Group chats appear when you join a group. Friend and dating chats open once both of you say yes."
            />
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}
