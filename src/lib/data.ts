import { supabase } from './supabase';
import { must } from './use-load';

export type GroupRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  access: 'open' | 'restricted';
  my_status: 'approved' | 'pending' | null;
  members: number;
};

export async function loadGroups(uid: string): Promise<GroupRow[]> {
  const groups = must(await supabase.from('groups').select('id, slug, name, description, access, group_members(user_id, status)').order('name'));
  return (groups as any[]).map((g) => {
    const mine = g.group_members.find((m: any) => m.user_id === uid);
    return {
      ...g,
      my_status: mine?.status ?? null,
      members: g.group_members.filter((m: any) => m.status === 'approved').length,
    };
  });
}


export type Convo = {
  id: string;
  kind: 'friend' | 'dating' | 'group' | 'pro';
  title: string;
  other_id: string | null;
  last_body: string | null;
  last_at: string;
  unread: boolean;
};
