import { FlatList, Text, View } from 'react-native';

import { Button, Empty, ErrorText, Header, Screen, Small, timeAgo } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { must, useLoad } from '@/lib/use-load';
import { C, F } from '@/theme';

type Row = { id: string; display_name: string; created_at: string };

export default function Blocked() {
  const list = useLoad(async () => must(await supabase.rpc('my_blocked')) as Row[], []);

  async function unblock(id: string) {
    await supabase.from('blocks').delete().eq('blocked_id', id);
    list.reload();
  }

  return (
    <Screen scroll={false} padded={false}>
      <Header title="Blocked members" />
      <FlatList
        data={list.data ?? []}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 20, gap: 10 }}
        ListHeaderComponent={<ErrorText>{list.error}</ErrorText>}
        renderItem={({ item: r }) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: C.surface }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text }}>{r.display_name}</Text>
              <Small>Blocked · {timeAgo(r.created_at)}</Small>
            </View>
            <Button label="Unblock" kind="secondary" style={{ height: 40 }} onPress={() => unblock(r.id)} />
          </View>
        )}
        ListEmptyComponent={list.loaded ? <Empty icon="shield" title="You haven't blocked anyone" /> : undefined}
      />
    </Screen>
  );
}
