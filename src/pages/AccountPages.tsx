import {CustomerOrdersPanel} from '../components/account/CustomerOrdersPanel';
import {AccountSettingsPanel} from '../components/account/AccountSettingsPanel';
import {AdminOrdersPanel} from '../components/account/AdminOrdersPanel';
import {AdminProductsPanel} from '../components/account/AdminProductsPanel';
import {AddressManager} from '../components/account/AddressManager';
import {AdminInventoryPanel} from '../components/account/AdminInventoryPanel';
import {AdminCustomersPanel} from '../components/account/AdminCustomersPanel';
import {AdminPassportPanel} from '../components/account/AdminPassportPanel';
import {AdminReviewsPanel} from '../components/admin/AdminReviewsPanel';
import {ProtectedRoute, sanitizeRedirectUrl} from '../components/auth/ProtectedRoute';
import {useEffect,useState,type FormEvent,type ReactNode} from 'react';
import {useAuth,apiUrl,type Account} from '../context/AuthContext';
import {Link,useNavigate,useSearchParams} from '../router/router';
import {usePageMeta} from '../hooks/usePageMeta';
type Mode='login'|'register'|'forgot'|'reset'|'admin';
const styles='w-full rounded-xl border border-ink/25 bg-white px-4 py-3 text-ink';
function Shell({title,children}:{title:string;children:ReactNode}){return <main className="mx-auto max-w-lg px-4 py-16 sm:px-6"><div className="rounded-3xl border border-ink/20 bg-white p-6 shadow-xl sm:p-9"><h1 className="font-display text-4xl font-extrabold">{title}</h1><div className="mt-7">{children}</div></div></main>;}
export function AuthPage({mode}:{mode:Mode}){
 const {login,register,requestPasswordReset,updatePassword,isSupabase}=useAuth(),navigate=useNavigate();
 const [params]=useSearchParams();const [name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 usePageMeta(mode==='register'?'Create account':mode==='admin'?'Admin sign in':'Account access');
 async function submit(e:FormEvent){
  e.preventDefault();setBusy(true);setError('');setMessage('');
  try{
   if(mode==='register'){
    if(password!==confirm)throw Error('Passwords do not match');
    const u=await register(name,email,password);
    const dest=sanitizeRedirectUrl(params.get('from'),u.role==='ADMIN'?'/admin':'/account');
    navigate(dest);
   }else if(mode==='login'||mode==='admin'){
    const u=await login(email,password);
    if(mode==='admin'&&u.role!=='ADMIN')throw Error('Administrator access required');
    const dest=sanitizeRedirectUrl(params.get('from'),u.role==='ADMIN'?'/admin':'/account');
    navigate(dest);
   }else if(mode==='forgot'){
    const res=await requestPasswordReset(email);
    setMessage(res.message||'Check your email for a password reset link.');
   }else{
    if(isSupabase){
     await updatePassword(password);
     setMessage('Password reset successful. You can now sign in with your new password.');
     setTimeout(()=>navigate('/login'),2000);
    }else{
     if(!apiUrl)throw Error('Authentication backend is not configured.');
     const r=await fetch(apiUrl+'/api/auth/reset-password',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:params.get('token')??'',password})});
     const d=await r.json();if(!r.ok)throw Error(d.error||'Request failed');
     setMessage('Password reset. You can now sign in.');
    }
   }
  }catch(e){setError(e instanceof Error?e.message:'Something went wrong');}finally{setBusy(false);}
 }
 const title={login:'Welcome back.',register:'Join the club.',forgot:'Reset your password.',reset:'Choose a new password.',admin:'Sticker Club admin.'}[mode];
 return <Shell title={title}><form onSubmit={submit} className="space-y-4">
  {mode==='register'&&<label className="block text-sm font-bold">Full name<input className={'mt-2 '+styles} required maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label>}
  {mode!=='reset'&&<label className="block text-sm font-bold">Email<input className={'mt-2 '+styles} required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>}
  {mode!=='forgot'&&<label className="block text-sm font-bold">{mode==='reset'?'New password':'Password'}<input className={'mt-2 '+styles} required type="password" minLength={12} autoComplete={mode==='login'||mode==='admin'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)}/></label>}
  {mode==='register'&&<label className="block text-sm font-bold">Confirm password<input className={'mt-2 '+styles} required type="password" minLength={12} value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>}
  {error&&<p role="alert" className="rounded-lg bg-danger/10 p-3 text-sm text-danger">{error}</p>}
  {message&&<p role="status" className="rounded-lg bg-mint/10 p-3 text-sm">{message}</p>}
  <button className="btn-primary w-full" disabled={busy} type="submit">{busy?'Working…':mode==='register'?'Create account':mode==='forgot'?'Request reset':mode==='reset'?'Reset password':'Sign in'}</button>
 </form><div className="mt-6 flex flex-wrap gap-4 text-sm">
 {mode!=='login'&&<Link className="underline" to="/login">Customer login</Link>}
 {mode!=='register'&&<Link className="underline" to="/register">Register</Link>}
 {mode!=='forgot'&&<Link className="underline" to="/forgot-password">Forgot password?</Link>}
 </div></Shell>;
}
export function Guard({role,children}:{role:'ADMIN'|'CUSTOMER';children:(u:Account)=>ReactNode}){
 return <ProtectedRoute role={role}>{children}</ProtectedRoute>;
}
export function CustomerDashboard() {
  usePageMeta('My account');
  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'settings'>('orders');

  return (
    <Guard role="CUSTOMER">
      {(u) => (
        <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/15 pb-6">
            <div>
              <h1 className="font-display text-4xl font-extrabold sm:text-5xl">Your account</h1>
              <p className="mt-2 text-ink-soft">
                {u.name} · {u.email}
              </p>
            </div>
            <div className="flex rounded-xl bg-paper p-1" role="tablist" aria-label="Account sections">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'orders'}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                  activeTab === 'orders' ? 'bg-white text-ink shadow' : 'text-ink-soft hover:text-ink'
                }`}
                onClick={() => setActiveTab('orders')}
              >
                My Orders
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'addresses'}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                  activeTab === 'addresses' ? 'bg-white text-ink shadow' : 'text-ink-soft hover:text-ink'
                }`}
                onClick={() => setActiveTab('addresses')}
              >
                Addresses
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'settings'}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                  activeTab === 'settings' ? 'bg-white text-ink shadow' : 'text-ink-soft hover:text-ink'
                }`}
                onClick={() => setActiveTab('settings')}
              >
                Settings
              </button>
            </div>
          </div>

          <div className="mt-8">
            {activeTab === 'orders' && <CustomerOrdersPanel />}
            {activeTab === 'addresses' && <AddressManager />}
            {activeTab === 'settings' && <AccountSettingsPanel />}
          </div>
        </main>
      )}
    </Guard>
  );
}

export function AdminDashboard() {
  usePageMeta('Store admin');
  const { request, logout, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<{
    customers?: number;
    products?: number;
    orders?: number;
    pendingOrders?: number;
    totalRevenue?: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'customers' | 'products' | 'inventory' | 'passport' | 'reviews'>('orders');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    request<typeof stats>('/api/admin/stats')
      .then(setStats)
      .catch((e) => setError(String(e)));
  }, [user?.id]);

  const statCards = [
    { label: 'Total Customers', value: stats?.customers ?? '—' },
    { label: 'Products', value: stats?.products ?? '—' },
    { label: 'Total Orders', value: stats?.orders ?? '—' },
    { label: 'Pending Orders', value: stats?.pendingOrders ?? '—' },
    { label: 'Paid Revenue', value: stats?.totalRevenue ? `₹${stats.totalRevenue}` : '₹0' },
  ];

  return (
    <Guard role="ADMIN">
      {(u) => (
        <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/15 pb-6">
            <div>
              <h1 className="font-display text-4xl font-extrabold sm:text-5xl">Store Admin</h1>
              <p className="mt-2 text-ink-soft">Logged in as {u.email}</p>
            </div>
            <button
              className="btn-ghost text-xs"
              type="button"
              onClick={() => void logout().then(() => navigate('/'))}
            >
              Log out
            </button>
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-danger/10 p-3 text-sm text-danger">
              {error}
            </p>
          )}

          {/* Stats Grid */}
          <div className="mt-8 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {statCards.map((c) => (
              <div key={c.label} className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wider text-ink-soft">{c.label}</p>
                <p className="mt-2 font-display text-2xl font-bold sm:text-3xl text-ink">{c.value}</p>
              </div>
            ))}
          </div>

          {/* Tab Navigation */}
          <div className="mt-8 flex flex-wrap gap-2 rounded-2xl bg-paper p-1.5" role="tablist" aria-label="Admin tabs">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'orders'}
              className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
                activeTab === 'orders' ? 'bg-white text-ink shadow' : 'text-ink-soft hover:text-ink'
              }`}
              onClick={() => setActiveTab('orders')}
            >
              Orders & Payments
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'customers'}
              className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
                activeTab === 'customers' ? 'bg-white text-ink shadow' : 'text-ink-soft hover:text-ink'
              }`}
              onClick={() => setActiveTab('customers')}
            >
              Customers Directory
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'products'}
              className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
                activeTab === 'products' ? 'bg-white text-ink shadow' : 'text-ink-soft hover:text-ink'
              }`}
              onClick={() => setActiveTab('products')}
            >
              Product Catalogue
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'inventory'}
              className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
                activeTab === 'inventory' ? 'bg-white text-ink shadow' : 'text-ink-soft hover:text-ink'
              }`}
              onClick={() => setActiveTab('inventory')}
            >
              Inventory Management
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'passport'}
              className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
                activeTab === 'passport' ? 'bg-white text-ink shadow' : 'text-ink-soft hover:text-ink'
              }`}
              onClick={() => setActiveTab('passport')}
            >
              Passport & Rewards
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'reviews'}
              className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all ${
                activeTab === 'reviews' ? 'bg-white text-ink shadow' : 'text-ink-soft hover:text-ink'
              }`}
              onClick={() => setActiveTab('reviews')}
            >
              Customer Reviews
            </button>
          </div>

          {/* Active Tab Panel */}
          <div className="mt-4">
            {activeTab === 'orders' && <AdminOrdersPanel />}
            {activeTab === 'customers' && <AdminCustomersPanel />}
            {activeTab === 'products' && <AdminProductsPanel />}
            {activeTab === 'inventory' && <AdminInventoryPanel />}
            {activeTab === 'passport' && <AdminPassportPanel />}
            {activeTab === 'reviews' && <AdminReviewsPanel />}
          </div>
        </main>
      )}
    </Guard>
  );
}
