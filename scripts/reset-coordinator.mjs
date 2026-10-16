// Operator-only recovery. Never expose this script as an HTTP endpoint.
import {createClient} from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import {createHash} from 'node:crypto';
const {SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,TK_COORDINATOR_USERNAME,TK_COORDINATOR_PASSWORD} = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !TK_COORDINATOR_USERNAME || !TK_COORDINATOR_PASSWORD) throw Error('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TK_COORDINATOR_USERNAME and TK_COORDINATOR_PASSWORD in the operator environment.');
if (!/^[a-zA-Z0-9._]{3,24}$/.test(TK_COORDINATOR_USERNAME)) throw Error('Invalid username.');
if (TK_COORDINATOR_PASSWORD.length < 12 || TK_COORDINATOR_PASSWORD.length > 72 || createHash('sha256').update(TK_COORDINATOR_PASSWORD).digest('hex') === '9c4b95dbebcbfb09a528dbacbb17ea0aeb2a31b859f470747f3ca1dd63c02256') throw Error('Choose a new password between 12 and 72 characters.');
const db=createClient(SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const {data:user,error:lookupError}=await db.from('users').select('id,role').ilike('username',TK_COORDINATOR_USERNAME).maybeSingle();
if(lookupError)throw Error('Could not look up the coordinator.');
if(!user || user.role!=='admin')throw Error('An existing coordinator account is required. No account was changed.');
const {error}=await db.from('users').update({password_hash:await bcrypt.hash(TK_COORDINATOR_PASSWORD,12)}).eq('id',user.id);
if(error)throw Error('Could not reset the coordinator password.');
console.log('Coordinator password replaced. Previous sessions are invalid.');
