import {useEffect,useState,type FormEvent} from 'react';
import {useAuth} from '../../context/AuthContext';
type Address={id:string;recipient:string;line1:string;line2:string|null;city:string;state:string;postalCode:string;isDefault:boolean};
type Form={recipient:string;line1:string;line2:string;city:string;state:string;postalCode:string};
const blank:Form={recipient:'',line1:'',line2:'',city:'Hyderabad',state:'Telangana',postalCode:''};
export function AddressManager(){
 const {user,request}=useAuth();
 const [addresses,setAddresses]=useState<Address[]>([]);
 const [editing,setEditing]=useState<string|null>(null);
 const [form,setForm]=useState<Form>(blank);
 const [error,setError]=useState(''),[message,setMessage]=useState('');
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 async function load(){setAddresses(await request<Address[]>('/api/me/addresses'));}
 useEffect(()=>{if(!user)return;void load().catch(e=>setError(String(e))).finally(()=>setLoading(false));},[user?.id]);
 function startEdit(a?:Address){setEditing(a?.id??'new');setForm(a?{recipient:a.recipient,line1:a.line1,line2:a.line2??'',city:a.city,state:a.state,postalCode:a.postalCode}:blank);setError('');}
 async function save(e:FormEvent){e.preventDefault();setBusy(true);setError('');setMessage('');
  try{
   const url=editing==='new'?'/api/me/addresses':'/api/me/addresses/'+encodeURIComponent(editing??'');
   await request(url,{method:editing==='new'?'POST':'PATCH',body:JSON.stringify({...form,isDefault:editing==='new'&&!addresses.length})});
   await load();setEditing(null);setMessage('Address saved.');
  }catch(e){setError(e instanceof Error?e.message:'Unable to save address');}finally{setBusy(false);}
 }
 async function act(id:string,action:'delete'|'default'){
  setError('');setBusy(true);
  try{await request(action==='delete'?'/api/me/addresses/'+encodeURIComponent(id):'/api/me/addresses/'+encodeURIComponent(id)+'/default',{method:action==='delete'?'DELETE':'POST'});await load();setMessage(action==='delete'?'Address deleted.':'Default address updated.');}
  catch(e){setError(e instanceof Error?e.message:'Update failed');}finally{setBusy(false);}
 }
 if(!user)return null;
 return <section className="rounded-2xl bg-white p-6">
  <h2 className="text-2xl font-bold">My addresses</h2>
  {loading&&<p className="mt-2">Loading addresses…</p>}
  {error&&<p className="mt-3 text-sm text-danger" role="alert">{error}</p>}
  {message&&<p className="mt-3 text-sm" role="status">{message}</p>}
  {!addresses.length&&!loading&&<p className="mt-3 text-ink-soft">No saved addresses yet.</p>}
  <ul className="mt-3 space-y-3">{addresses.map(a=><li key={a.id} className="rounded-xl border border-ink/15 p-3">
   <p className="font-bold">{a.recipient}{a.isDefault?' · Default':''}</p>
   <p className="mt-1 text-sm">{a.line1}{a.line2?', '+a.line2:''}, {a.city}, {a.state} {a.postalCode}</p>
   <div className="mt-3 flex flex-wrap gap-3 text-sm">
    <button className="underline" type="button" onClick={()=>startEdit(a)}>Edit</button>
    {!a.isDefault&&<button className="underline" type="button" disabled={busy} onClick={()=>void act(a.id,'default')}>Make default</button>}
    <button className="underline" type="button" disabled={busy} onClick={()=>{if(window.confirm('Delete this address?'))void act(a.id,'delete');}}>Delete</button>
   </div>
  </li>)}</ul>
  {!editing?<button type="button" className="btn-ghost mt-4" onClick={()=>startEdit()}>Add address</button>:
   <form onSubmit={save} className="mt-5 grid gap-3">
    {([['recipient','Recipient name'],['line1','Building and street'],['line2','Apartment / landmark (optional)'],['city','City'],['state','State'],['postalCode','Postal code']] as const).map(([key,label])=>
     <label key={key} className="text-sm font-bold">{label}<input className="field-input mt-1" required={key!=='line2'} minLength={key==='postalCode'?3:undefined} maxLength={key==='postalCode'?15:undefined} value={form[key]} onChange={e=>setForm(a=>({...a,[key]:e.target.value}))}/></label>)}
    <div className="flex gap-3"><button className="btn-primary" disabled={busy} type="submit">{busy?'Saving…':'Save address'}</button><button className="btn-ghost" type="button" onClick={()=>setEditing(null)}>Cancel</button></div>
   </form>}
 </section>;
}
