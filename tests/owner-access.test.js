import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import {createHmac} from 'node:crypto';
process.env.SUPABASE_URL='https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY='test-service-key';
process.env.JWT_SECRET='owner-tests-jwt-secret-not-for-production';
const CODE='482916';
process.env.OWNER_ACCESS_CODE=CODE;
const {default:access,ownerSession}=await import('../api/_lib/owner-access.js');
const {default:manage}=await import('../api/users/promote.js');
const {supabase}=await import('../api/_lib/supabase.js');
const {comparePassword,generateToken,usernamePattern}=await import('../api/_lib/auth.js');
const origin='https://tk.example';
function response(){return {code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(data){this.body=data;return this;}};}
function request(method='GET',body={},cookie=''){return {method,body,query:{},headers:{host:'tk.example',origin,cookie,'x-real-ip':'test-address'}};}
async function unlock(){process.env.OWNER_ACCESS_CODE=CODE;const res=response();await access(request('POST',{code:CODE}),res);assert.equal(res.code,200);return res.headers['Set-Cookie'].split(';')[0];}
test('missing and non-6-digit codes fail closed without a management cookie',async()=>{
 for(const value of ['', 'short', '12345', '1234567', 'abcdef', '12 345']){process.env.OWNER_ACCESS_CODE=value;const res=response();await access(request('POST',{code:'anything'}),res);assert.equal(res.code,503);assert.equal(res.headers['Set-Cookie'],undefined);}
 process.env.OWNER_ACCESS_CODE=CODE;
});
test('wrong code and cross-origin unlock attempts never grant a session',async()=>{
 const wrong=response();await access(request('POST',{code:'wrong'}),wrong);assert.equal(wrong.code,403);assert.equal(wrong.headers['Set-Cookie'],undefined);
 const cross=request('POST',{code:CODE});cross.headers.origin='https://other.example';const res=response();await access(cross,res);assert.equal(res.code,403);assert.equal(res.headers['Set-Cookie'],undefined);
});
test('correct code grants a secure short-lived cookie without returning the code or token in JSON',async()=>{
 const res=response();await access(request('POST',{code:CODE}),res);assert.equal(res.code,200);
 assert.match(res.headers['Set-Cookie'],/HttpOnly; Secure; SameSite=Strict; Max-Age=900/);
 assert.equal(res.body.success,true);assert.equal(res.body.code,undefined);assert.equal(res.body.token,undefined);
 const cookie=res.headers['Set-Cookie'].split(';')[0];assert.equal(ownerSession(request('GET',{},cookie)).scope,'manage-users');
});
test('code rotation and expiry invalidate management sessions',async()=>{
 const cookie=await unlock();process.env.OWNER_ACCESS_CODE='739105';assert.equal(ownerSession(request('GET',{},cookie)),null);process.env.OWNER_ACCESS_CODE=CODE;
 const key=createHmac('sha256',process.env.JWT_SECRET).update('tk-owner-console:'+CODE).digest('hex');
 const expired=jwt.sign({scope:'manage-users'},key,{expiresIn:-1,audience:'tk-owner-console',issuer:'tkcamnorte'});
 assert.equal(ownerSession(request('GET',{},'tk_owner='+expired)),null);
});
test('lock clears the management cookie',async()=>{
 const res=response();await access(request('DELETE'),res);assert.equal(res.code,200);assert.match(res.headers['Set-Cookie'],/Max-Age=0/);
});
test('ordinary member and admin tokens cannot change roles without the secret-code session',async()=>{
 let reads=0;supabase.from=()=>{reads++;throw Error('Should not read users');};
 for(const role of ['user','admin']){const req=request('PATCH',{userId:'member',role:'admin'});req.headers.authorization='Bearer '+generateToken('member',role,'hash');const res=response();await manage(req,res);assert.equal(res.code,401);}
 assert.equal(reads,0);
});
test('management writes reject cross-origin requests even with a valid cookie',async()=>{
 const req=request('PATCH',{userId:'member',role:'admin'},await unlock());req.headers.origin='https://other.example';const res=response();await manage(req,res);assert.equal(res.code,403);
});
function database(){
 const rows=new Map([['admin',{id:'admin',full_name:'Coordinator',username:'coordinator',role:'admin',password_hash:'hash'}],['member',{id:'member',full_name:'Member',username:'member_one',role:'user',password_hash:'hash'}],['history',{id:'history',full_name:'Author',username:'author',role:'user',password_hash:'hash'}]]);
 const operations=[];
 supabase.from=table=>{
  assert.equal(table,'users');let action='read',values,select='',filter,pattern,counting=false;
  const q={select(fields,options){select=fields;counting=!!options?.head;return this;},order(){return this;},eq(key,value){filter=[key,value];return this;},ilike(_key,value){pattern=value.replaceAll('\\_','_');return this;},insert(items){action='create';values=items[0];return this;},update(updates){action='update';values=updates;return this;},delete(){action='delete';return this;},maybeSingle(){return run(true);},single(){return run(true);},then(resolve,reject){return run(false).then(resolve,reject);}};
  async function run(single){
   operations.push({action,filter});let found=[...rows.values()].filter(row=>(!filter||row[filter[0]]===filter[1])&&(!pattern||row.username.toLowerCase()===pattern.toLowerCase()));
   if(counting)return {count:found.length,error:null};
   if(action==='delete'){if(found.some(row=>row.id==='history'))return {data:null,error:{code:'23503'}};found.forEach(row=>rows.delete(row.id));}
   if(action==='update'){found=found.map(row=>({...row,...values}));found.forEach(row=>rows.set(row.id,row));}
   if(action==='create'){found=[{id:'created',...values}];rows.set('created',found[0]);}
   const fields=select.split(',').map(s=>s.trim());const data=found.map(row=>Object.fromEntries(fields.filter(f=>f in row).map(f=>[f,row[f]])));
   return {data:single?data[0]||null:data,error:null};
  }
  return q;
 };
 return {rows,operations};
}
test('unlocked manager can create, edit, promote and demote users',async()=>{
 const cookie=await unlock();const db=database();let res=response();
 await manage(request('POST',{action:'create',fullName:'New Member',username:'new_member',role:'user',password:'test-password-12345'},cookie),res);
 assert.equal(res.code,201);assert.equal(res.body.user.password_hash,undefined);assert.ok(comparePassword('test-password-12345',db.rows.get('created').password_hash));
 res=response();await manage(request('PATCH',{userId:'created',fullName:'Updated Member',role:'admin'},cookie),res);assert.equal(res.code,200);assert.equal(db.rows.get('created').role,'admin');
 res=response();await manage(request('PATCH',{userId:'created',role:'user'},cookie),res);assert.equal(res.code,200);assert.equal(db.rows.get('created').role,'user');
});
test('last admin is protected, and invalid roles are rejected',async()=>{
 const cookie=await unlock();const db=database();
 for(const method of ['PATCH','DELETE']){const res=response();await manage(request(method,{userId:'admin',role:'user'},cookie),res);assert.equal(res.code,409);assert.equal(db.rows.get('admin').role,'admin');}
 const res=response();await manage(request('PATCH',{userId:'member',role:'owner'},cookie),res);assert.equal(res.code,400);
});
test('deletion is one statement and foreign-key failures do not partially remove data',async()=>{
 const cookie=await unlock();const db=database();let res=response();await manage(request('DELETE',{userId:'history'},cookie),res);assert.equal(res.code,409);assert.ok(db.rows.has('history'));
 res=response();await manage(request('DELETE',{userId:'member'},cookie),res);assert.equal(res.code,200);assert.equal(db.rows.has('member'),false);
 assert.equal(db.operations.filter(op=>op.action==='delete').length,2);
});
test('username underscores are escaped for case-insensitive exact lookups',()=>{assert.equal(usernamePattern('member_one'),'member\\_one');});
test('repeated wrong codes are temporarily throttled on a running instance',async()=>{
 for(let i=0;i<6;i++){const req=request('POST',{code:'wrong'});req.headers['x-real-ip']='rate-test';const res=response();await access(req,res);assert.equal(res.code,i<5?403:429);}
});
