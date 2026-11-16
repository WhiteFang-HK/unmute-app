import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
const db = new PGlite();
await db.exec(`create schema auth; create table auth.users (id uuid primary key, email text);
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create role anon nologin; create role authenticated nologin; grant usage on schema public, auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
create publication supabase_realtime;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;`);
for (const f of process.argv.slice(2)) await db.exec(fs.readFileSync(f,'utf8'));
const U=i=>`00000000-0000-0000-0000-00000000000${i}`;
for (const i of [1,2,3,4]) await db.query(`insert into auth.users values ($1,$2)`,[U(i),i+'@x']);
await db.exec(`update profiles set role='admin' where id='${U(3)}'`);
async function as(i,sql,p=[]){await db.exec(`reset role; select set_config('request.jwt.claim.sub','${U(i)}',false); set role authenticated;`);try{return await db.query(sql,p)}finally{await db.exec('reset role')}}
let pass=0,fail=0; const ok=(l,c)=>c?pass++:(fail++,console.log('FAIL',l));
const err=async(l,f)=>{try{await f();fail++;console.log('FAIL (no error)',l)}catch(e){pass++}};
for (const [i,n,st] of [[1,'Alpha_One','divorced'],[2,'Beta_Two','separated'],[3,'Admin_Three','prefer_not'],[4,'Delta_Four','divorced']]) { await as(i,`select complete_basics($1,'1985-01-01','man','Pune','en')`,[n]); await as(i,`select set_stage($1)`,[st]); await as(i,`select set_interests(array[1,2]::smallint[])`); await as(i,`select finish_onboarding(true,true,true)`); }
const notes=async i=>(await as(i,`select kind,title,body,link,count,read_at,category from notifications order by created_at`)).rows;
// tour
let r=await as(1,`select tour_seen from my_profile()`); ok('tour default false', r.rows[0].tour_seen===false);
await as(1,`update profiles set tour_seen=true where id=$1`,[U(1)]);
r=await as(1,`select tour_seen from my_profile()`); ok('tour saved', r.rows[0].tour_seen===true);
// friend request + accept
await as(1,`select send_friend_request($1,'hi there')`,[U(2)]);
let n2=await notes(2); ok('friend request notified', n2.length===1 && n2[0].kind==='friend_request' && n2[0].title.includes('Alpha_One') && n2[0].link==='/requests');
ok('no self notification', (await notes(1)).length===0);
const req=(await as(2,`select id from friend_requests where to_id=$1`,[U(2)])).rows[0].id;
await as(2,`select respond_friend_request($1,true)`,[req]);
let n1=await notes(1); ok('accepted notified', n1.some(x=>x.kind==='friend_accepted'));
// messages merge
const conv=(await as(1,`select id from my_conversations() where kind='friend'`)).rows[0].id;
await as(1,`insert into messages (conversation_id, body) values ($1,'one')`,[conv]);
await as(1,`insert into messages (conversation_id, body) values ($1,'two')`,[conv]);
await as(1,`insert into messages (conversation_id, body) values ($1,'three')`,[conv]);
n2=(await notes(2)).filter(x=>x.kind==='message'); ok('messages merged', n2.length===1 && n2[0].count===3 && n2[0].body==='three');
ok('sender not notified of own messages', !(await notes(1)).some(x=>x.kind==='message'));
r=await as(2,`select unread_notification_count() c`); ok('unread count', r.rows[0].c===2);
// isolation
r=await as(1,`select count(*) c from notifications where user_id=$1`,[U(2)]); ok('cannot read others', Number(r.rows[0].c)===0);
await err('cannot insert notifications', ()=>as(1,`insert into notifications (user_id,kind,category,title) values ($1,'match','matches','x')`,[U(2)]));
await err('cannot call notify', ()=>as(1,`select notify($1,null,'match','matches','fake',null,null,null)`,[U(2)]));
await err('cannot change title', ()=>as(2,`update notifications set title='x'`));
// mark read
await as(2,`select mark_all_notifications_read()`);
r=await as(2,`select unread_notification_count() c`); ok('mark all read', r.rows[0].c===0);
await as(1,`insert into messages (conversation_id, body) values ($1,'four')`,[conv]);
n2=(await notes(2)).filter(x=>x.kind==='message'); ok('new row after read', n2.length===2);
// match
await as(1,`select accept_dating_policy()`); await as(4,`select accept_dating_policy()`);
await as(1,`select dating_respond($1,true)`,[U(4)]); await as(4,`select dating_respond($1,true)`,[U(1)]);
ok('match both', (await notes(1)).some(x=>x.kind==='match') && (await notes(4)).some(x=>x.kind==='match' && x.link.startsWith('/chat/')));
// replies + review (4 is new member -> pending post)
const g=(await as(1,`select id from groups where slug='life-after-divorce'`)).rows[0].id;
for (const i of [1,2,3,4]) await as(i,`select join_group($1)`,[g]);
await as(4,`insert into posts (group_id, body, is_anonymous) values ($1,'my story',true)`,[g]);
const pid=(await as(3,`select id from admin_pending_posts()`)).rows[0].id;
await as(3,`select admin_moderate_post($1,'published','ok')`,[pid]);
ok('post approved notified', (await notes(4)).some(x=>x.kind==='post_approved'));
await as(2,`insert into comments (post_id, body) values ($1,'sending strength')`,[pid]);
await as(1,`insert into comments (post_id, body) values ($1,'same here')`,[pid]);
let rp=(await notes(4)).filter(x=>x.kind==='reply'); ok('replies merged', rp.length===1 && rp[0].count===2);
await as(4,`insert into comments (post_id, body) values ($1,'thank you')`,[pid]);
rp=(await notes(4)).filter(x=>x.kind==='reply'); ok('own reply not notified', rp[0].count===2);
// blocks
await as(4,`select block_user($1)`,[U(2)]);
const before=(await notes(4)).filter(x=>x.kind==='reply')[0].count;
await db.exec(`reset role`); await db.query(`insert into comments (post_id, author_id, body) values ($1,$2,'from blocked')`,[pid,U(2)]);
ok('blocked pair skipped', (await notes(4)).filter(x=>x.kind==='reply')[0].count===before);
// prefs
await as(2,`insert into notification_prefs (messages) values (false)`);
r=await as(2,`select messages, friends from notification_prefs`); ok('prefs saved', r.rows[0].messages===false && r.rows[0].friends===true);
r=await as(1,`select count(*) c from notification_prefs`); ok('prefs private', Number(r.rows[0].c)===0);
r=await as(2,`insert into notification_prefs (user_id,friends,matches,messages,replies) values ($1,false,true,false,true) on conflict (user_id) do update set user_id=excluded.user_id, friends=excluded.friends, messages=excluded.messages returning friends`,[U(2)]); ok('prefs upsert', r.rows[0].friends===false);
await err('cannot upsert for someone else', ()=>as(1,`insert into notification_prefs (user_id) values ($1)`,[U(2)]));
// push tokens
await as(2,`select register_push_token('ExponentPushToken[abc123]','ios')`);
await err('bad token rejected', ()=>as(2,`select register_push_token('hello','ios')`));
await err('tokens not readable', ()=>as(2,`select * from push_tokens`));
r=await db.query(`select user_id from push_tokens`); ok('token stored', r.rows.length===1 && r.rows[0].user_id===U(2));
await as(1,`insert into messages (conversation_id, body) values ($1,'five')`,[conv]); ok('push without pg_net does not break', true);
await as(2,`select remove_push_token('ExponentPushToken[abc123]')`);
r=await db.query(`select count(*) c from push_tokens`); ok('token removed', Number(r.rows[0].c)===0);
// appeal
await as(3,`select admin_set_member_status($1,'suspended','test')`,[U(1)]);
await as(1,`insert into appeals (message) values ('please review my account kindly')`);
const ap=(await as(3,`select id from admin_open_appeals()`)).rows[0].id;
await as(3,`select admin_decide_appeal($1,true,'reinstated')`,[ap]);
ok('appeal notified', (await notes(1)).some(x=>x.kind==='appeal' && x.title.includes('active again')));
// delete cascades
await as(2,`select delete_my_account('DELETE')`);
r=await db.query(`select count(*) c from notifications where user_id=$1`,[U(2)]); ok('notifications deleted with account', Number(r.rows[0].c)===0);
console.log(`${pass} passed, ${fail} failed`);
