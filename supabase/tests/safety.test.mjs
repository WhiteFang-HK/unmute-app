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
for (const i of [1,2,3]) await db.query(`insert into auth.users values ($1,$2)`,[U(i),i+'@x']);
await db.exec(`update profiles set role='admin' where id='${U(3)}'`);
async function as(i,sql,p=[]){await db.exec(`reset role; select set_config('request.jwt.claim.sub','${U(i)}',false); set role authenticated;`);try{return await db.query(sql,p)}finally{await db.exec('reset role')}}
let pass=0,fail=0; const ok=(l,c)=>c?pass++:(fail++,console.log('FAIL',l));
const err=async(l,f)=>{try{await f();fail++;console.log('FAIL (no error)',l)}catch(e){pass++}};
for (const [i,n,st] of [[1,'Alpha_One','divorced'],[2,'Beta_Two','separated'],[3,'Admin_Three','prefer_not']]) { await as(i,`select complete_basics($1,'1985-01-01','man','Pune','en')`,[n]); await as(i,`select set_stage($1)`,[st]); await as(i,`select set_interests(array[1,2]::smallint[])`); await as(i,`select finish_onboarding(true,true,true)`); }
// own profile via my_profile
let r=await as(1,`select age_range, city, show_age from my_profile()`); ok('my_profile', r.rows[0].age_range && r.rows[0].city==='Pune');
await err('others cannot read real age_range', ()=>as(2,`select age_range from profiles`));
// visibility
await as(1,`update profiles set show_city=false where id=$1`,[U(1)]);
r=await as(2,`select * from friend_suggestions()`); const a=r.rows.find(x=>x.display_name==='Alpha_One'); ok('city hidden in suggestions', a && a.city===null && a.age_range);
r=await as(2,`select public_city from profiles where id=$1`,[U(1)]); ok('public_city null', r.rows[0].public_city===null);
r=await as(1,`select * from my_public_card()`); ok('preview card hides city', r.rows[0].city===null);
// post review
const g=(await as(1,`select id from groups where slug='life-after-divorce'`)).rows[0].id;
await as(1,`select join_group($1)`,[g]); await as(2,`select join_group($1)`,[g]); await as(3,`select join_group($1)`,[g]);
await as(1,`insert into posts (group_id, body) values ($1,'new member post')`,[g]);
r=await as(2,`select * from feed()`); ok('pending post hidden from others', r.rows.length===0);
r=await as(1,`select review_state from feed()`); ok('author sees own pending', r.rows[0]?.review_state==='pending');
await as(3,`insert into posts (group_id, body) values ($1,'staff post')`,[g]);
r=await as(2,`select body from feed()`); ok('staff post published', r.rows.some(x=>x.body==='staff post'));
r=await as(3,`select * from admin_pending_posts()`); ok('admin sees pending', r.rows.length===1 && r.rows[0].author_name==='Alpha_One');
await err('member cannot list pending', ()=>as(2,`select * from admin_pending_posts()`));
await as(3,`select admin_moderate_post($1,'published','ok')`,[r.rows[0].id]);
r=await as(2,`select body from feed()`); ok('approved visible', r.rows.some(x=>x.body==='new member post'));
// suspend + appeal
await err('active member cannot appeal', ()=>as(2,`insert into appeals (message) values ('please review my account')`));
await as(3,`select admin_set_member_status($1,'suspended','spam links')`,[U(2)]);
r=await as(2,`select * from my_restriction()`); ok('restriction reason', r.rows[0].status==='suspended' && r.rows[0].reason==='spam links');
await as(2,`insert into appeals (message) values ('I did not post spam, please review')`);
await err('only one open appeal', ()=>as(2,`insert into appeals (message) values ('second appeal text here')`));
r=await as(3,`select * from admin_open_appeals()`); ok('admin sees appeal', r.rows.length===1);
await as(3,`select admin_decide_appeal($1,true,'reviewed, reinstated')`,[r.rows[0].id]);
r=await as(2,`select status from my_profile()`); ok('reinstated', r.rows[0].status==='active');
r=await as(2,`select appeal_status from my_restriction()`); ok('appeal accepted', r.rows[0].appeal_status==='accepted');
// unmatch lookup
await as(1,`select accept_dating_policy()`); await as(2,`select accept_dating_policy()`);
await as(1,`select dating_respond($1,true)`,[U(2)]); const conv=(await as(2,`select dating_respond($1,true) c`,[U(1)])).rows[0].c;
const m=(await as(1,`select match_for_conversation($1) m`,[conv])).rows[0].m; ok('match lookup', !!m);
await as(1,`select unmatch($1)`,[m]);
r=await as(1,`select match_for_conversation($1) m`,[conv]); ok('unmatched', r.rows[0].m===null);
// export
r=await as(1,`select export_my_data() d`); const d=r.rows[0].d; ok('export has data', d.profile.display_name==='Alpha_One' && d.posts.length===1 && d.private_details.relationship_stage==='divorced');
// delete
await err('delete needs confirm', ()=>as(1,`select delete_my_account('nope')`));
await as(1,`select delete_my_account('DELETE')`);
r=await db.query(`select count(*) n from profiles where id=$1`,[U(1)]); ok('account deleted', r.rows[0].n==0);
r=await db.query(`select count(*) n from posts where body='new member post'`); ok('posts deleted', r.rows[0].n==0);
console.log(`${pass} passed, ${fail} failed`);
