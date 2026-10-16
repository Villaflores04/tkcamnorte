import test from 'node:test';
import assert from 'node:assert/strict';
import { activityStatus, todayKey, scheduleEntries, isCurrent } from '../public/js/dates.js';
import { validateAnnouncement } from '../api/_lib/announcement-validation.js';

test('Philippine date rolls over independently of UTC', () => {
  assert.equal(todayKey(new Date('2026-10-15T17:00:00Z')), '2026-10-16');
});
test('pinning and deadlines never imply an ongoing activity', () => {
  assert.equal(activityStatus({is_pinned:true},'2026-10-15'),'');
  assert.equal(activityStatus({deadline_date:'2026-10-20'},'2026-10-15'),'');
  assert.equal(activityStatus({starts_at:'2026-10-16'},'2026-10-15'),'Upcoming');
  assert.equal(activityStatus({starts_at:'2026-10-15'},'2026-10-15'),'Ongoing');
  assert.equal(activityStatus({starts_at:'2026-10-14'},'2026-10-15'),'Completed');
});
test('schedule keeps activity and deadline separate', () => {
  const p = {starts_at:'2026-10-16',ends_at:'2026-10-17',deadline_date:'2026-10-20'};
  assert.deepEqual(scheduleEntries([p],'2026-10-15').map(e => [e.date,e.kind]),[['2026-10-16','Activity'],['2026-10-20','Deadline']]);
  assert.deepEqual(scheduleEntries([p],'2026-10-18').map(e => e.kind),['Deadline']);
});
test('editing a post makes old reads and acknowledgments stale', () => {
  const p={updated_at:'2026-10-15T09:00:00Z'};
  assert.equal(isCurrent('2026-10-15T08:00:00Z',p),false);
  assert.equal(isCurrent('2026-10-15T09:00:00Z',p),true);
});
test('date and content validation rejects impossible or inconsistent inputs', () => {
  for (const body of [{title:'  '},{startsAt:'2026-02-30'},{endsAt:'2026-10-16'},{startsAt:'2026-10-16',endsAt:'2026-10-15'},{callTime:'25:70'},{coverImageUrl:'javascript:alert(1)'}]) assert.ok(validateAnnouncement(body));
  assert.equal(validateAnnouncement({title:'Practice',content:'Instructions',startsAt:'2026-10-16',endsAt:'2026-10-17',callTime:'15:30'}),null);
});
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-key';
process.env.JWT_SECRET = 'test-only-secret-at-least-32-characters';
const {supabase} = await import('../api/_lib/supabase.js');
const {generateToken,requireUser,requireAdmin} = await import('../api/_lib/auth.js');
const {default:jwt} = await import('jsonwebtoken');
function response() { return { code:200, setHeader(){}, status(code){this.code=code;return this;},json(body){this.body=body;return this;} }; }
function account(row,error=null) {supabase.from = () => ({select(){return this;},eq(){return this;},async maybeSingle(){return {data:row,error};}});}
function request(token) {return {headers:{authorization:'Bearer '+token}};}
test('old tokens are rejected before any database access',async()=>{
 const res=response(); const token=jwt.sign({userId:'x',role:'admin'},process.env.JWT_SECRET);
 assert.equal(await requireUser(request(token),res),null);assert.equal(res.code,401);
});
test('a demotion takes effect despite an existing admin token',async()=>{
 account({id:'x',role:'user',password_hash:'hash1'});
 const res=response();assert.equal(await requireAdmin(request(generateToken('x','admin','hash1')),res),null);assert.equal(res.code,403);
});
test('password changes and account deletion revoke existing tokens',async()=>{
 const token=generateToken('x','user','hash1');
 for (const row of [{id:'x',role:'user',password_hash:'hash2'},null]) {account(row);const res=response();assert.equal(await requireUser(request(token),res),null);assert.equal(res.code,401);}
});
test('database outages fail closed without pretending a session is invalid',async()=>{
 account(null,{message:'unavailable'});const res=response();assert.equal(await requireUser(request(generateToken('x','user','hash1')),res),null);assert.equal(res.code,503);
});
