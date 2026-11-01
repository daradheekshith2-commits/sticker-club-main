import {useEffect,useState} from 'react';
import {useAuth} from '../../context/AuthContext';

type ProductRecord={id:string;slug:string;name:string;price:string;inventory:{quantity:number}|null;active:boolean};
/** Stock counts are real database records. Never seed imaginary quantities. */
export function AdminInventoryPanel(){
 const {user,request}=useAuth();
 const [products,setProducts]=useState<ProductRecord[]>([]);
 const [draft,setDraft]=useState<Record<string,string>>({});
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState<string|null>(null);
 const [bulkQty,setBulkQty]=useState('25');
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const reload=async()=>{
  const res=await request<any>('/api/admin/products?limit=100');
  const p: ProductRecord[] = Array.isArray(res) ? res : res?.items || res?.products || [];
  setProducts(p);
  setDraft(Object.fromEntries(p.map(x=>[x.id,x.inventory?String(x.inventory.quantity):''])));
 };
 useEffect(()=>{if(user?.role!=='ADMIN')return;void reload().catch(e=>setError(String(e))).finally(()=>setLoading(false));},[user?.id]);
 async function save(productId:string){
  setError('');setMessage('');
  const raw=draft[productId];const quantity=Number(raw);
  if(!/^\d+$/.test(raw??'')||!Number.isSafeInteger(quantity)){setError('Enter a whole number for stock.');return;}
  setBusy(productId);
  try{
   await request('/api/admin/inventory/'+encodeURIComponent(productId),{method:'PUT',body:JSON.stringify({quantity})});
   await reload();setMessage('Inventory updated in PostgreSQL.');
  }catch(e){setError(e instanceof Error?e.message:'Could not update inventory');}
  finally{setBusy(null);}
 }
 async function bulkInit(){
  const q=Number(bulkQty);
  if(!Number.isInteger(q)||q<0){setError('Enter a valid non-negative integer for bulk stock.');return;}
  setBusy('bulk');setError('');setMessage('');
  try{
   const res=await request<{count:number;message:string}>('/api/admin/inventory/bulk-init',{method:'POST',body:JSON.stringify({quantity:q})});
   await reload();setMessage(res.message);
  }catch(e){setError(e instanceof Error?e.message:'Bulk initialization failed');}
  finally{setBusy(null);}
 }
 if(user?.role!=='ADMIN')return null;
 const unconfiguredCount = products.filter(p=>p.inventory===null).length;
 return <section className="mt-6 rounded-2xl bg-white p-6">
  <div className="flex flex-wrap items-center justify-between gap-3">
   <div>
    <h2 className="text-2xl font-bold">Inventory management</h2>
    <p className="mt-1 text-sm text-ink-soft">Stock counts are real PostgreSQL records. Unset stock prevents orders to avoid overselling.</p>
   </div>
   {unconfiguredCount > 0 && (
    <div className="flex items-center gap-2 rounded-xl border border-ink/15 p-2 bg-[#F9F9F8]">
     <span className="text-xs font-bold text-ink-soft">Unset ({unconfiguredCount})</span>
     <input
      type="number"
      min="0"
      className="field-input w-20 py-1 text-xs"
      value={bulkQty}
      onChange={e=>setBulkQty(e.target.value)}
      aria-label="Default stock quantity for bulk setup"
     />
     <button
      type="button"
      className="btn-primary py-1 px-3 text-xs"
      disabled={busy==='bulk'}
      onClick={()=>void bulkInit()}
     >
      {busy==='bulk'?'Initializing…':'Initialize All Unset'}
     </button>
    </div>
   )}
  </div>
  {loading && (
    <p className="mt-3 text-sm text-ink-soft animate-pulse" role="status">
      Loading inventory from database…
    </p>
  )}
  {error && <p className="mt-3 text-danger" role="alert">{error}</p>}
  {message && <p className="mt-3 text-sm text-mint font-bold" role="status">{message}</p>}
  {!loading && products.length === 0 && (
    <p className="mt-4 text-sm text-ink-soft">No products found in database.</p>
  )}
  <ul className="mt-4 max-h-[36rem] space-y-3 overflow-auto">
   {products.map(p=><li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink/15 p-3">
    <div className="min-w-0">
     <div className="flex items-center gap-2">
      <strong className="block">{p.name}</strong>
      {p.inventory === null ? (
       <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-bold text-danger border border-danger/20">
        Stock not configured
       </span>
      ) : (
       <span className="rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-bold text-[#0D6B4E]">
        {p.inventory.quantity} in stock
       </span>
      )}
     </div>
     <span className="text-xs text-ink-soft">{p.slug} · ₹{p.price} · {p.active?'Active':'Archived'}</span>
    </div>
    <div className="flex items-center gap-2">
     <label className="text-xs font-bold">Stock
      <input aria-label={'Stock for '+p.name} inputMode="numeric" className="field-input mt-1 w-24" value={draft[p.id]??''} placeholder="Unset" onChange={e=>setDraft(d=>({...d,[p.id]:e.target.value}))}/>
     </label>
     <button type="button" className="btn-ghost self-end" disabled={busy===p.id} onClick={()=>void save(p.id)}>{busy===p.id?'Saving…':'Save'}</button>
    </div>
   </li>)}
  </ul>
 </section>;
}
