import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Button, Card, Chip, Empty, ErrorText, Header, Screen, Small, timeAgo } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { must, useLoad } from '@/lib/use-load';
import { C, F } from '@/theme';

type Report = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reported_user_id: string | null;
  post_id: string | null;
  reported: { display_name: string; status: string } | null;
  post: { body: string; review_state: string } | null;
};
type Pending = { group_id: string; user_id: string; groups: { name: string } | null; profiles: { display_name: string } | null };

export default function Admin() {
  const [tab, setTab] = useState<'reports' | 'joins'>('reports');
  const reports = useLoad(
    async () =>
      must(
        await supabase
          .from('reports')
          .select('id, reason, details, status, created_at, reported_user_id, post_id, reported:profiles!reports_reported_user_id_fkey(display_name, status), post:posts(body, review_state)')
          .in('status', ['new', 'in_review'])
          .order('created_at'),
      ) as unknown as Report[],
    [],
  );
  const joins = useLoad(
    async () =>
      must(
        await supabase
          .from('group_members')
          .select('group_id, user_id, groups(name), profiles(display_name)')
          .eq('status', 'pending'),
      ) as unknown as Pending[],
    [],
  );

  function ask(title: string, run: (reason: string) => Promise<unknown>) {
    Alert.alert(title, 'This is recorded in the audit log.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        style: 'destructive',
        onPress: async () => {
          await run(title);
          reports.reload();
        },
      },
    ]);
  }

  return (
    <Screen>
      <Header title="Moderation" eyebrow="Staff only" />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <Chip label={`Reports · ${reports.data?.length ?? 0}`} selected={tab === 'reports'} onPress={() => setTab('reports')} />
        <Chip label={`Join requests · ${joins.data?.length ?? 0}`} selected={tab === 'joins'} onPress={() => setTab('joins')} />
      </View>
      <ErrorText>{reports.error ?? joins.error}</ErrorText>

      {tab === 'reports' ? (
        <View style={{ gap: 10, marginTop: 12 }}>
          {(reports.data ?? []).map((r) => (
            <Card key={r.id} style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: F.heavy, fontSize: 12, letterSpacing: 1, color: C.ember }}>{r.reason.replace('_', ' ').toUpperCase()}</Text>
                <Small>{timeAgo(r.created_at)}</Small>
              </View>
              {r.reported ? (
                <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text }}>
                  Member: {r.reported.display_name} ({r.reported.status})
                </Text>
              ) : null}
              {r.post ? <Text style={{ fontFamily: F.body, fontSize: 14, color: C.softer }} numberOfLines={4}>Post: “{r.post.body}”</Text> : null}
              {r.details ? <Small>Reporter says: {r.details}</Small> : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {r.post_id ? (
                  <Button
                    label="Hide post"
                    style={{ height: 40 }}
                    onPress={() =>
                      ask('Hide post', async (why) => {
                        await supabase.rpc('admin_moderate_post', { p_post: r.post_id, p_state: 'hidden', p_reason: why });
                        await supabase.rpc('admin_update_report', { p_report: r.id, p_status: 'actioned', p_reason: why });
                      })
                    }
                  />
                ) : null}
                {r.reported_user_id ? (
                  <Button
                    label="Suspend member"
                    style={{ height: 40 }}
                    onPress={() =>
                      ask('Suspend member', async (why) => {
                        await supabase.rpc('admin_set_member_status', { p_user: r.reported_user_id, p_status: 'suspended', p_reason: why });
                        await supabase.rpc('admin_update_report', { p_report: r.id, p_status: 'actioned', p_reason: why });
                      })
                    }
                  />
                ) : null}
                <Button
                  label="Dismiss"
                  kind="secondary"
                  style={{ height: 40 }}
                  onPress={() => ask('Dismiss report', (why) => supabase.rpc('admin_update_report', { p_report: r.id, p_status: 'dismissed', p_reason: why }) as unknown as Promise<unknown>)}
                />
              </View>
            </Card>
          ))}
          {reports.loaded && !reports.data?.length ? <Empty icon="check-circle" title="No open reports" /> : null}
        </View>
      ) : (
        <View style={{ gap: 10, marginTop: 12 }}>
          {(joins.data ?? []).map((j) => (
            <Card key={j.group_id + j.user_id} style={{ gap: 8 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text }}>{j.profiles?.display_name ?? 'Member'}</Text>
              <Small>wants to join {j.groups?.name}</Small>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button
                  label="Decline"
                  kind="secondary"
                  style={{ flex: 1, height: 40 }}
                  onPress={async () => {
                    await supabase.rpc('admin_review_group_member', { p_group: j.group_id, p_user: j.user_id, p_approve: false });
                    joins.reload();
                  }}
                />
                <Button
                  label="Approve"
                  style={{ flex: 1, height: 40 }}
                  onPress={async () => {
                    await supabase.rpc('admin_review_group_member', { p_group: j.group_id, p_user: j.user_id, p_approve: true });
                    joins.reload();
                  }}
                />
              </View>
            </Card>
          ))}
          {joins.loaded && !joins.data?.length ? <Empty icon="check-circle" title="No pending requests" /> : null}
        </View>
      )}
    </Screen>
  );
}
