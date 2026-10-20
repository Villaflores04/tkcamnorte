import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFile} from 'node:fs/promises';
import {SourceTextModule} from 'node:vm';
import path from 'node:path';
const user={id:'test-user',fullName:'Test Member',username:'member',role:'admin'};
const posts=[{id:'one',title:'Rehearsal instructions',content:'Please prepare your assigned part.',category:'general',is_pinned:true,requires_ack:true,starts_at:'2099-10-20',call_time:'16:00:00',venue:'Practice venue',created_at:'2026-10-15T08:00:00Z',updated_at:'2026-10-15T08:00:00Z',attachments:[]},{id:'two',title:'Song line-up',content:'Review the songs.',category:'song_lineup',created_at:'2026-10-14T08:00:00Z',updated_at:'2026-10-14T08:00:00Z',attachments:[]}];
async function setup(page,options={}) {
 const html=await readFile('public/'+page,'utf8');
 const dom=new JSDOM(html,{url:'https://example.test/'+page+(options.query||''),runScripts:'outside-only'});
 const w=dom.window; w.matchMedia=()=>({matches:false}); w.CSS={escape:v=>v}; w.confirm=()=>true;
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 if(!['login.html','register.html','access.html','user-management.html'].includes(page))w.localStorage.setItem('token','test');const calls=[];const receipts=[];
 const managedUsers=[{id:'coordinator',full_name:'Coordinator',username:'coordinator',role:'admin'},{id:'member',full_name:'Member One',username:'member_one',role:'user'}];
 w.fetch=async(endpoint,request={})=>{
  calls.push({endpoint,request});const url=new URL(endpoint,'https://example.test');let data,status=200;
  if(url.pathname==='/api/users/promote') {
   if(url.searchParams.get('resource')==='access')data={unlocked:Boolean(options.ownerUnlocked),success:true};
   else if(request.method && request.method!=='GET') {const body=JSON.parse(request.body);const target=managedUsers.find(user=>user.id===body.userId);if(target)Object.assign(target,body);data={success:true};}
   else data=managedUsers;
  }
  else if(url.pathname==='/api/auth/me') {data=options.user || user;if(options.failAuth){data={error:'Unavailable'};status=503;}}
  else if(url.pathname==='/api/announcements' && url.searchParams.get('resource')==='hub') {if(options.failPosts){data={error:'Test unavailable'};status=503;}else data={announcements:posts,receipts,trackingAvailable:true};}
  else if(url.pathname==='/api/announcements' && !url.searchParams.has('resource')) {if(options.failPosts){data={error:'Test unavailable'};status=503;} else data=url.searchParams.has('id')?posts.find(p=>p.id===url.searchParams.get('id')):posts;}
  else if(url.pathname==='/api/users/all')data=[{id:user.id,full_name:user.fullName,role:'admin',username:'member'}];
  else if(url.pathname==='/api/users/profile')data=user;
  else if(url.pathname==='/api/announcements' && url.searchParams.get('resource')==='receipts'){
   if(request.method==='POST'){const b=JSON.parse(request.body);let r=receipts.find(r=>r.announcement_id===b.announcementId);if(!r){r={announcement_id:b.announcementId,user_id:user.id};receipts.push(r);}r.read_version=b.version;if(b.action==='acknowledge')r.acknowledged_version=b.version;data={success:true};}else data=receipts;
  }else if(url.pathname==='/api/comments')data=[];else data={success:true};
  return {ok:status===200,status,json:async()=>structuredClone(data)};
 };
 const context=dom.getInternalVMContext();const modules=new Map();
 async function load(id,code){if(modules.has(id))return modules.get(id);const mod=new SourceTextModule(code??await readFile('public'+id,'utf8'),{context,identifier:id});modules.set(id,mod);await mod.link((specifier,reference)=>load(specifier.startsWith('/')?specifier:path.posix.resolve(path.posix.dirname(reference.identifier),specifier)));return mod;}
 for(const script of w.document.querySelectorAll('script')){
  if(script.type==='module'){const mod=script.src?await load(new URL(script.src).pathname):await load('/inline-'+modules.size+'.js',script.textContent);await mod.evaluate();}
  else if(script.textContent.trim())w.eval(script.textContent);
 }
 const flush=()=>new Promise(resolve=>setTimeout(resolve,20));await flush();
 return {w,dom,calls,flush,common:modules.get('/js/common.js').namespace};
}
test('dashboard renders real cards, schedule, counts and four member destinations',async()=>{
 const {w,dom}=await setup('index.html');
 assert.equal(w.document.querySelector('#welcomeName').textContent,'Test');
 assert.equal(w.document.querySelectorAll('#announcementsList article').length,2);
 assert.equal(w.document.querySelectorAll('.mobile-bottom-nav a').length,4);
 assert.match(w.document.querySelector('#dashboardSummary').textContent,/Rehearsal instructions/);
 assert.equal(w.document.querySelector('#notifyBadge').textContent,'2');dom.window.close();
});
test('feed search and category filters work without extra API requests',async()=>{
 const {w,dom,calls}=await setup('announcements.html');const search=w.document.querySelector('#search');
 const before=calls.length;search.value='songs';search.dispatchEvent(new w.Event('input'));
 assert.equal(w.document.querySelectorAll('#announcementsList article').length,1);
 assert.match(w.document.querySelector('#announcementsList').textContent,/Song line-up/);
 assert.equal(calls.length,before);
 search.value='';search.dispatchEvent(new w.Event('input'));w.document.querySelector('[data-category="general"]').click();
 assert.equal(w.document.querySelectorAll('#announcementsList article').length,1);dom.window.close();
});
test('detail records read separately, then persists explicit acknowledgment',async()=>{
 const {w,dom,calls,flush}=await setup('announcement.html',{query:'?id=one'});
 assert.ok(calls.some(c=>c.request.body?.includes('"action":"read"')));
 assert.equal(w.document.querySelector('#acknowledge').disabled,false);
 w.document.querySelector('#acknowledge').click();await flush();
 assert.ok(calls.some(c=>c.request.body?.includes('"action":"acknowledge"')));
 assert.equal(w.document.querySelector('#acknowledge').textContent.trim(),'Got it!');
 assert.equal(w.document.querySelector('#acknowledge').disabled,true);
 assert.ok(w.document.querySelector('#responseCard').classList.contains('is-done'));
 assert.equal(w.document.querySelector('#ackDetails').hidden,true);dom.window.close();
});
test('coordinator templates, preview and local draft save retain content',async()=>{
 const {w,dom}=await setup('admin.html');const template=w.document.querySelector('#template');template.value='rehearsal';template.dispatchEvent(new w.Event('change'));
 assert.equal(w.document.querySelector('#title').value,'Rehearsal instructions');
 w.document.querySelector('#saveDraftBtn').click();assert.match(w.localStorage.getItem('tk-draft-test-user'),/Preparation checklist/);
 w.document.querySelector('#previewBtn').click();assert.equal(w.document.querySelector('#previewDialog').open,true);assert.match(w.document.querySelector('#previewContent').textContent,/Preparation checklist/);dom.window.close();
});
test('calendar errors remain errors instead of becoming an empty schedule',async()=>{
 const {w,dom}=await setup('calendar.html',{failPosts:true});assert.match(w.document.querySelector('#dayList').textContent,/Unable to load schedule/);assert.ok(w.document.querySelector('#retrySchedule'));dom.window.close();
});

test('dashboard startup uses one account check and one shared data request',async()=>{
 const {dom,calls}=await setup('index.html');
 assert.deepEqual(calls.map(c=>c.endpoint).sort(),['/api/announcements?resource=hub','/api/auth/me']);
 dom.window.close();
});
test('drawer is above the backdrop in the root context and has a working close control',async()=>{
 const {w,dom}=await setup('index.html');const drawer=w.document.querySelector('#navLinks');
 assert.equal(drawer.parentElement,w.document.body);
 w.document.querySelector('#hamburger').click();
 assert.ok(drawer.classList.contains('show'));assert.equal(drawer.getAttribute('aria-modal'),'true');
 assert.equal(w.document.activeElement.id,'closeMenuBtn');
 w.document.querySelector('#closeMenuBtn').click();
 assert.equal(drawer.classList.contains('show'),false);assert.equal(w.document.querySelector('#navScrim').classList.contains('show'),false);
 assert.equal(w.document.activeElement.id,'hamburger');dom.window.close();
});
test('a mutation invalidates the shared snapshot before the next data read',async()=>{
 const {dom,calls,common}=await setup('index.html');const count=()=>calls.filter(c=>c.endpoint.includes('resource=hub')).length;
 await common.getCommunityData();assert.equal(count(),1);
 await common.apiJson('/reactions',{method:'POST',body:JSON.stringify({announcementId:'one',type:'like'})});
 await common.getCommunityData();assert.equal(count(),2);dom.window.close();
});
test('member menu does not grant coordinator navigation',async()=>{
 const {w,dom}=await setup('index.html',{user:{...user,role:'user'}});
 assert.equal(w.document.querySelector('#navLinks a[href="/admin.html"]'),null);
 assert.match(w.document.querySelector('.nav-user').textContent,/Member/);dom.window.close();
});
test('temporary account lookup failure offers retry without deleting the token',async()=>{
 const {w,dom,common}=await setup('index.html');
 w.fetch=async()=>({ok:false,status:503,json:async()=>({error:'Unavailable'})});
 assert.equal(await common.requireAuth(),null);
 assert.equal(w.localStorage.getItem('token'),'test');
 assert.ok(w.document.querySelector('#retrySession'));dom.window.close();
});

test('login has secret-code navigation, accessible password toggle and useful login errors',async()=>{
 const {w,dom,flush}=await setup('login.html');
 assert.equal(w.document.querySelector('.secret-code-link').getAttribute('href'),'/access.html');
 w.document.querySelector('[data-password="loginPassword"]').click();assert.equal(w.document.querySelector('#loginPassword').type,'text');
 w.fetch=async()=>({ok:false,status:401,json:async()=>({error:'Incorrect username or password.'})});
 w.document.querySelector('#username').value='member';w.document.querySelector('#loginPassword').value='wrong-password';
 w.document.querySelector('#authForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await flush();
 assert.equal(w.document.querySelector('#formError').textContent,'Incorrect username or password.');assert.equal(w.document.querySelector('#submitBtn').disabled,false);dom.window.close();
});
test('registration preserves invitation-code validation and catches password mismatch before sending',async()=>{
 const {w,dom,calls,flush}=await setup('register.html');
 assert.ok(w.document.querySelector('#inviteCode').required);assert.equal(w.document.querySelector('.secret-code-link').getAttribute('href'),'/access.html');
 w.document.querySelector('#username').value='member';w.document.querySelector('#password').value='test-password';w.document.querySelector('#confirmPassword').value='different-password';
 w.document.querySelector('#authForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await flush();
 assert.match(w.document.querySelector('#formError').textContent,/do not match/);assert.equal(calls.length,0);dom.window.close();
});
test('secret code is submitted only to the server and is not stored in browser storage',async()=>{
 const {w,dom,flush}=await setup('access.html');
 w.fetch=async(endpoint,request)=>{assert.equal(endpoint,'/api/users/promote?resource=access');assert.equal(JSON.parse(request.body).code,'private-test-code');return {ok:false,status:403,json:async()=>({error:'Incorrect secret code.'})};};
 w.document.querySelector('#secretCode').value='private-test-code';w.document.querySelector('#accessForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await flush();
 assert.equal(w.localStorage.length,1);assert.equal(w.localStorage.getItem('tk-theme'),'light');assert.equal(w.document.querySelector('#accessError').textContent,'Incorrect secret code.');dom.window.close();
});
test('owner console filters members and confirms role changes before sending them',async()=>{
 const {w,dom,calls,flush}=await setup('user-management.html',{ownerUnlocked:true});
 assert.equal(w.document.querySelectorAll('.owner-user-row').length,2);
 w.document.querySelector('#roleFilter').value='user';w.document.querySelector('#roleFilter').dispatchEvent(new w.Event('change'));assert.equal(w.document.querySelectorAll('.owner-user-row').length,1);
 w.document.querySelector('[data-role-user="member"]').click();assert.equal(w.document.querySelector('#ownerConfirmDialog').open,true);assert.equal(calls.some(call=>call.request.method==='PATCH'),false);
 w.document.querySelector('#confirmAction').click();await flush();
 const write=calls.find(call=>call.request.method==='PATCH');assert.equal(JSON.parse(write.request.body).role,'admin');assert.equal(w.document.querySelector('#totalAdmins').textContent,'2');dom.window.close();
});
