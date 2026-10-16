import { escapeHtml as esc, icon, hydrateIcons, mountThemeToggle, avatarUrl, showToast } from './common.js';
const ENDPOINT = '/api/users/promote';
const ACCESS = ENDPOINT + '?resource=access';
mountThemeToggle(document.getElementById('authThemeHost'));
hydrateIcons(document);
async function request(url, options = {}) {
  try {
    const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data, error: data.error || 'Please try again.' };
  } catch { return { ok: false, status: 0, error: 'Unable to connect. Check your connection and try again.' }; }
}
function message(id, text) { const el = document.getElementById(id);el.textContent=text || '';el.hidden=!text; }
function passwordToggle(button, input) {
  const show = input.type === 'password'; input.type = show ? 'text' : 'password';
  button.innerHTML = icon(show ? 'eyeOff' : 'eye');button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
}
const accessForm = document.getElementById('accessForm');
if (accessForm) {
  let unlocking = false;
  document.getElementById('toggleCode').onclick = e => passwordToggle(e.currentTarget, document.getElementById('secretCode'));
  accessForm.onsubmit = async e => {
    e.preventDefault();if(unlocking)return;unlocking=true;message('accessError','');
    const button=document.getElementById('unlockBtn');button.disabled=true;button.querySelector('span').textContent='Checking your code…';
    try {
      const result=await request(ACCESS,{method:'POST',body:JSON.stringify({code:document.getElementById('secretCode').value})});
      if(!result.ok){message('accessError',result.error);return;}
      document.getElementById('secretCode').value='';location.href='/user-management.html';
    } finally {unlocking=false;button.disabled=false;button.querySelector('span').textContent='Unlock user management';}
  };
  const status=await request(ACCESS);
  if(status.ok && status.data.unlocked)location.href='/user-management.html';
} else {
  let users=[], page=1, editingId=null, action=null, saving=false, confirming=false;
  const workspace=document.getElementById('ownerWorkspace');
  const userDialog=document.getElementById('userDialog');
  const confirmDialog=document.getElementById('ownerConfirmDialog');
  const find=id=>users.find(user=>user.id===id);
  function locked(result) {
    if(result.status!==401)return false;
    users=[];workspace.hidden=true;document.getElementById('ownerUsers').replaceChildren();location.href='/access.html';return true;
  }
  function render() {
    const search=document.getElementById('userSearch').value.trim().toLowerCase();
    const role=document.getElementById('roleFilter').value;
    const filtered=users.filter(user=>(role==='all'||user.role===role)&&`${user.full_name} ${user.username}`.toLowerCase().includes(search));
    const pages=Math.max(1,Math.ceil(filtered.length/10));page=Math.min(page,pages);
    document.getElementById('totalUsers').textContent=users.length;
    document.getElementById('totalAdmins').textContent=users.filter(user=>user.role==='admin').length;
    document.getElementById('totalMembers').textContent=users.filter(user=>user.role==='user').length;
    document.getElementById('userResultCount').textContent=`${filtered.length} user${filtered.length===1?'':'s'}`;
    document.getElementById('ownerUsers').innerHTML=filtered.length?filtered.slice((page-1)*10,page*10).map(user=>`<li class="owner-user-row"><div class="owner-person"><img src="${esc(avatarUrl(user))}" alt=""><div><strong>${esc(user.full_name)}</strong><p>@${esc(user.username)}</p></div></div><span class="badge ${user.role==='admin'?'owner-admin-badge':'owner-member-badge'}">${user.role==='admin'?'Admin · can post':'Member'}</span><div class="owner-row-actions"><button class="btn btn-ghost" data-role-user="${esc(user.id)}">${user.role==='admin'?'Demote':'Promote to admin'}</button><button class="btn btn-ghost" data-edit-user="${esc(user.id)}">Edit</button><button class="btn btn-danger" data-delete-user="${esc(user.id)}" aria-label="Delete ${esc(user.full_name)}">Delete</button></div></li>`).join(''):'<li class="owner-empty">No users match this search.</li>';
    const pager=document.getElementById('ownerPagination');
    pager.innerHTML=pages>1?`<button class="btn btn-ghost" id="ownerPrev" ${page===1?'disabled':''}>Previous</button><span class="meta">${page} / ${pages}</span><button class="btn btn-ghost" id="ownerNext" ${page===pages?'disabled':''}>Next</button>`:'';
    pager.querySelector('#ownerPrev')?.addEventListener('click',()=>{page--;render();});pager.querySelector('#ownerNext')?.addEventListener('click',()=>{page++;render();});
  }
  async function loadUsers() {
    const button=document.getElementById('refreshUsers');button.disabled=true;message('ownerError','');
    try {
      const result=await request(ENDPOINT);if(locked(result))return;
      if(!result.ok||!Array.isArray(result.data)){message('ownerError',result.error);return;}
      users=result.data;render();
    } finally {button.disabled=false;}
  }
  function openEditor(user=null) {
    editingId=user?.id||null;document.getElementById('userForm').reset();message('userFormError','');
    document.getElementById('userDialogTitle').textContent=user?'Edit user':'Add user';
    document.getElementById('managedName').value=user?.full_name||'';
    document.getElementById('managedUsername').value=user?.username||'';
    document.getElementById('managedRole').value=user?.role||'user';
    const password=document.getElementById('managedPassword');password.required=!user;password.type='password';
    document.getElementById('managedPasswordLabel').textContent=user?'New password · optional':'Initial password';
    document.getElementById('managedPasswordHelp').textContent=user?'Leave blank to keep the password. Setting a new password ends existing sign-in sessions.':'12–72 characters. Share it privately with this user.';
    document.getElementById('toggleManagedPassword').innerHTML=icon('eye');document.getElementById('toggleManagedPassword').setAttribute('aria-label','Show password');
    document.getElementById('saveUser').textContent=user?'Save changes':'Create user';userDialog.showModal();
  }
  function confirmChange(user, removing=false) {
    action={userId:user.id,removing,role:user.role==='admin'?'user':'admin',username:user.username};
    document.getElementById('confirmTitle').textContent=removing?`Delete ${user.full_name}?`:`${user.role==='admin'?'Demote':'Promote'} ${user.full_name}?`;
    document.getElementById('confirmDescription').textContent=removing?'This removes the account and its comments, reactions, and acknowledgments. Accounts with announcement history are preserved and cannot be deleted.':user.role==='admin'?'This user will become a member and lose access to posting announcements on their next request.':'This user will become an admin and can publish, edit, and remove announcements.';
    document.getElementById('deleteConfirmationField').hidden=!removing;document.getElementById('deleteUsername').value='';message('confirmError','');
    const button=document.getElementById('confirmAction');button.textContent=removing?'Delete user':'Confirm role change';button.className=removing?'btn btn-danger':'btn';button.disabled=removing;confirmDialog.showModal();
  }
  document.getElementById('deleteUsername').oninput=e=>{document.getElementById('confirmAction').disabled=confirming||e.target.value!==action?.username;};
  document.getElementById('ownerUsers').onclick=e=>{
    const edit=e.target.closest('[data-edit-user]'),remove=e.target.closest('[data-delete-user]'),role=e.target.closest('[data-role-user]');
    if(edit)openEditor(find(edit.dataset.editUser));
    if(remove)confirmChange(find(remove.dataset.deleteUser),true);
    if(role)confirmChange(find(role.dataset.roleUser));
  };
  document.getElementById('userForm').onsubmit=async e=>{
    e.preventDefault();if(saving)return;saving=true;message('userFormError','');
    const button=document.getElementById('saveUser');button.disabled=true;
    const body={action:editingId?'update':'create',userId:editingId,fullName:document.getElementById('managedName').value.trim(),username:document.getElementById('managedUsername').value.trim(),role:document.getElementById('managedRole').value};
    const password=document.getElementById('managedPassword').value;if(password)body.password=password;
    try {
      const result=await request(ENDPOINT,{method:editingId?'PATCH':'POST',body:JSON.stringify(body)});if(locked(result))return;
      if(!result.ok){message('userFormError',result.error);return;}
      document.getElementById('managedPassword').value='';userDialog.close();showToast(editingId?'User updated.':'User created.','success');await loadUsers();
    } finally {saving=false;button.disabled=false;}
  };
  document.getElementById('confirmAction').onclick=async()=>{
    if(confirming||!action)return;if(action.removing&&document.getElementById('deleteUsername').value!==action.username)return;
    confirming=true;const button=document.getElementById('confirmAction');button.disabled=true;message('confirmError','');
    try {
      const result=await request(ENDPOINT,{method:action.removing?'DELETE':'PATCH',body:JSON.stringify({userId:action.userId,...(action.removing?{}:{role:action.role})})});if(locked(result))return;
      if(!result.ok){message('confirmError',result.error);return;}
      confirmDialog.close();showToast(action.removing?'User deleted.':'Role updated.','success');await loadUsers();
    } finally {confirming=false;button.disabled=action?.removing&&document.getElementById('deleteUsername').value!==action.username;}
  };
  document.getElementById('addUser').onclick=()=>openEditor();
  document.getElementById('closeUserDialog').onclick=()=>{if(!saving)userDialog.close();};document.getElementById('cancelUserDialog').onclick=()=>{if(!saving)userDialog.close();};
  document.getElementById('cancelOwnerAction').onclick=()=>{if(!confirming)confirmDialog.close();};
  userDialog.addEventListener('cancel',e=>{if(saving)e.preventDefault();});confirmDialog.addEventListener('cancel',e=>{if(confirming)e.preventDefault();});
  document.getElementById('toggleManagedPassword').onclick=e=>passwordToggle(e.currentTarget,document.getElementById('managedPassword'));
  document.getElementById('userSearch').oninput=()=>{page=1;render();};document.getElementById('roleFilter').onchange=()=>{page=1;render();};
  document.getElementById('refreshUsers').onclick=loadUsers;
  document.getElementById('lockOwner').onclick=async e=>{
    e.currentTarget.disabled=true;const result=await request(ACCESS,{method:'DELETE'});
    if(!result.ok){message('ownerError',result.error);e.currentTarget.disabled=false;return;}
    users=[];workspace.hidden=true;document.getElementById('ownerUsers').replaceChildren();location.href='/access.html';
  };
  const status=await request(ACCESS);
  if(!status.ok){document.getElementById('ownerLoading').textContent='Unable to verify this session. Reload to try again.';}
  else if(!status.data.unlocked){location.href='/access.html';}
  else{document.getElementById('ownerLoading').hidden=true;workspace.hidden=false;await loadUsers();}
}
