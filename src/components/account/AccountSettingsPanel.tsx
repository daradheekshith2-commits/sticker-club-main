import {useEffect,useState,type FormEvent} from 'react';
import {useAuth,type Account} from '../../context/AuthContext';
import {useNavigate} from '../../router/router';

export function AccountSettingsPanel(){
 const {user,request,logout}=useAuth(),navigate=useNavigate();
 const [name,setName]=useState(user?.name??''),[phone,setPhone]=useState(user?.phone??'');
 const [currentPassword,setCurrentPassword]=useState(''),[newPassword,setNewPassword]=useState(''),[confirm,setConfirm]=useState('');
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{setName(user?.name??'');setPhone(user?.phone??'');},[user?.id]);
 async function updateProfile(e:FormEvent){
  e.preventDefault();setBusy(true);setError('');setMessage('');
  try{const updated=await request<Account>('/api/me',{method:'PATCH',body:JSON.stringify({name,phone:phone||null})});setName(updated.name);setPhone(updated.phone??'');setMessage('Profile saved.');}
  catch(e){setError(e instanceof Error?e.message:'Could not save profile');}finally{setBusy(false);}
 }
 async function changePassword(e:FormEvent){
  e.preventDefault();setBusy(true);setError('');setMessage('');
  try{
   if(newPassword!==confirm)throw Error('New passwords do not match');
   await request('/api/me/password',{method:'POST',body:JSON.stringify({currentPassword,newPassword})});
   setCurrentPassword('');setNewPassword('');setConfirm('');
   await logout();navigate('/login');
  }catch(e){setError(e instanceof Error?e.message:'Could not change password');}finally{setBusy(false);}
 }
 if(!user)return null;
 return <section className="rounded-2xl bg-white p-6">
  <h2 className="text-2xl font-bold">Account settings</h2>
  {error&&<p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
  {message&&<p role="status" className="mt-3 text-sm">{message}</p>}
  <form className="mt-4 space-y-3" onSubmit={updateProfile}>
   <label className="block text-sm font-bold">Name<input className="field-input mt-1" required minLength={1} maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label>
   <label className="block text-sm font-bold">Phone (optional)<input className="field-input mt-1" type="tel" maxLength={30} value={phone} onChange={e=>setPhone(e.target.value)}/></label>
   <p className="text-xs text-ink-soft">Email: {user.email}</p>
   <button className="btn-ghost" type="submit" disabled={busy}>{busy?'Saving…':'Save profile'}</button>
  </form>
  <details className="mt-6 border-t border-ink/15 pt-4">
   <summary className="cursor-pointer font-bold">Change password</summary>
   <form className="mt-4 space-y-3" onSubmit={changePassword}>
    <label className="block text-sm font-bold">Current password<input className="field-input mt-1" required type="password" autoComplete="current-password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/></label>
    <label className="block text-sm font-bold">New password<input className="field-input mt-1" required type="password" minLength={12} autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label>
    <label className="block text-sm font-bold">Confirm new password<input className="field-input mt-1" required type="password" minLength={12} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
    <p className="text-xs text-ink-soft">Changing your password revokes refresh sessions on other devices; you will need to sign in again.</p>
    <button className="btn-primary" type="submit" disabled={busy}>{busy?'Updating…':'Change password'}</button>
   </form>
  </details>
  <button type="button" className="btn-ghost mt-5" onClick={()=>void logout().then(()=>navigate('/'))}>Log out</button>
 </section>;
}
