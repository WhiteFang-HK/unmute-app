import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PostCard, type FeedPost } from '@/components/post-card';
import { Body, Chip, Empty, ErrorText, Small } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { loadGroups } from '@/lib/data';
import { must, useLoad } from '@/lib/use-load';
import { C, F } from '@/theme';

export default function Community() {
  const { session, profile } = useAuth();
  const [tab, setTab] = useState<'feed' | 'groups'>('feed');
  const uid = session!.user.id;

  const feed = useLoad(async () => must(await supabase.rpc('feed', {})) as FeedPost[], []);
  const groups = useLoad(() => loadGroups(uid), [uid]);

  if (!profile?.community_on) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.ink, padding: 20 }} edges={['top']}>
        <Text style={{ fontFamily: F.display, fontSize: 34, color: C.text }}>Community</Text>
        <Empty icon="users" title="Community is off" body="Turn it on from Profile whenever you want to join groups." />
      </SafeAreaView>
    );
  }

  const joined = (groups.data ?? []).filter((g) => g.my_status === 'approved');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.ink }} edges={['top']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 34, letterSpacing: -1, color: C.text }}>
            Community
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Write a post"
            onPress={() => router.push('/compose')}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.community, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="edit-3" size={20} color={C.ink} />
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 12 }}>
          <Chip label="Feed" selected={tab === 'feed'} onPress={() => setTab('feed')} color={C.community} />
          <Chip label={`Groups${joined.length ? ` · ${joined.length} joined` : ''}`} selected={tab === 'groups'} onPress={() => setTab('groups')} color={C.community} />
        </View>
      </View>

      {tab === 'feed' ? (
        <FlatList
          data={feed.data ?? []}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30, gap: 10 }}
          refreshControl={<RefreshControl refreshing={feed.refreshing} onRefresh={feed.refresh} tintColor={C.ember} />}
          renderItem={({ item }) => <PostCard post={item} />}
          ListHeaderComponent={<ErrorText>{feed.error}</ErrorText>}
          ListEmptyComponent={
            feed.data ? (
              <Empty
                icon="message-square"
                title={joined.length ? 'Quiet in here' : 'Join a group to see posts'}
                body={joined.length ? 'Be the first to share something.' : 'Open the Groups tab and join one or two that fit.'}
              />
            ) : undefined
          }
        />
      ) : (
        <FlatList
          data={groups.data ?? []}
          keyExtractor={(g) => g.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30, gap: 10 }}
          refreshControl={<RefreshControl refreshing={groups.refreshing} onRefresh={groups.refresh} tintColor={C.ember} />}
          ListHeaderComponent={<ErrorText>{groups.error}</ErrorText>}
          renderItem={({ item: g }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/group/[id]', params: { id: g.id } })}
              style={{ padding: 16, borderRadius: 20, backgroundColor: C.surface, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ flex: 1, fontFamily: F.display, fontSize: 19, color: C.text }}>{g.name}</Text>
                {g.access === 'restricted' ? <Feather name="lock" size={14} color={C.muted} /> : null}
              </View>
              <Body style={{ fontSize: 14, lineHeight: 20 }}>{g.description}</Body>
              <Small>
                {g.members} {g.members === 1 ? 'member' : 'members'}
                {g.my_status === 'approved' ? ' · Joined' : g.my_status === 'pending' ? ' · Request sent' : ''}
              </Small>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}
