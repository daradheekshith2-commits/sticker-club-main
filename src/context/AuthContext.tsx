import {createContext,useCallback,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
export type Account={id:string;name:string;email:string;role:'CUSTOMER'|'ADMIN';phone?:string|null};
// Never silently point a deployed storefront at the visitor's own localhost.
const API=(import.meta.env.VITE_API_URL as string|undefined)?.replace(/[/]$/, '') || (import.meta.env.DEV ? 'http://localhost:5000' : '');
type AuthValue={user:Account|null;ready:boolean;token:string|null;login:(email:string,password:string)=>Promise<Account>;register:(name:string,email:string,password:string)=>Promise<Account>;logout:()=>Promise<void>;request:<T>(path:string,options?:RequestInit)=>Promise<T>;requestMultipart:<T>(path:string,formData:FormData)=>Promise<T>;refresh:()=>Promise<void>};
const Context=createContext<AuthValue|null>(null);
type SessionPayload={user:Account;accessToken:string};
let refreshInFlight:Promise<SessionPayload>|null=null;
async function refreshSession():Promise<SessionPayload>{
 if(!API)throw Error('Authentication backend is not configured.');
 if(!refreshInFlight){
  refreshInFlight=fetch(API+'/api/auth/refresh',{method:'POST',credentials:'include'})
   .then(async r=>{if(!r.ok)throw Error('Not signed in');return await r.json() as SessionPayload;})
   .finally(()=>{refreshInFlight=null;});
 }
 return refreshInFlight;
}
export function AuthProvider({children}:{children:ReactNode}){
 const [user,setUser]=useState<Account|null>(null),[token,setToken]=useState<string|null>(null),[ready,setReady]=useState(false);
 const refresh=useCallback(async()=>{
  try{const data=await refreshSession();setToken(data.accessToken);setUser(data.user);}
  catch(error){setToken(null);setUser(null);throw error;}
 },[]);
 useEffect(()=>{void refresh().catch(()=>{}).finally(()=>setReady(true));},[refresh]);
 const authenticate=async(path:string,body:unknown):Promise<Account>=>{
  if(!API)throw Error('Authentication backend is not configured.');
  const r=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify(body)});
  const data=await r.json();if(!r.ok)throw Error(data.error||'Authentication failed');
  setToken(data.accessToken);setUser(data.user);return data.user as Account;
 };
 const login=(email:string,password:string)=>authenticate('/api/auth/login',{email,password});
 const register=(name:string,email:string,password:string)=>authenticate('/api/auth/register',{name,email,password});
 const logout=async()=>{if(!API){setUser(null);setToken(null);return;}await fetch(API+'/api/auth/logout',{method:'POST',credentials:'include'}).catch(()=>{});setUser(null);setToken(null);};
 const request=async<T,>(path:string,options:RequestInit={}):Promise<T>=>{
  if(!API)throw Error('Authentication backend is not configured.');
  let current=token;
  if(!current){
   try{const restored=await refreshSession();current=restored.accessToken;setToken(current);setUser(restored.user);}
   catch{setToken(null);setUser(null);throw Error('Please sign in again');}
  }
  const send=(t:string)=>fetch(API+path,{...options,credentials:'include',headers:{'Content-Type':'application/json',...(options.headers||{}),Authorization:'Bearer '+t}});
  let r=await send(current);
  if(r.status===401){try{const data=await refreshSession();setToken(data.accessToken);setUser(data.user);current=data.accessToken;r=await send(current);}catch{setUser(null);setToken(null);throw Error('Please sign in again');}}
  if(!r.ok){const d=await r.json().catch(()=>({}));throw Error(d.error||'Request failed');}
  return r.json() as Promise<T>;
 };
 const requestMultipart=async<T,>(path:string,formData:FormData):Promise<T>=>{
  if(!API)throw Error('Authentication backend is not configured.');
  let current=token;
  if(!current){
   try{const restored=await refreshSession();current=restored.accessToken;setToken(current);setUser(restored.user);}
   catch{setToken(null);setUser(null);throw Error('Please sign in again');}
  }
  const send=(t:string)=>fetch(API+path,{method:'POST',credentials:'include',headers:{Authorization:'Bearer '+t},body:formData});
  let r=await send(current);
  if(r.status===401){try{const data=await refreshSession();setToken(data.accessToken);setUser(data.user);current=data.accessToken;r=await send(current);}catch{setUser(null);setToken(null);throw Error('Please sign in again');}}
  if(!r.ok){const d=await r.json().catch(()=>({}));throw Error(d.error||'Upload failed');}
  return r.json() as Promise<T>;
 };
 const value=useMemo(()=>({user,ready,token,login,register,logout,request,requestMultipart,refresh}),[user,ready,token,refresh]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAuth(){const value=useContext(Context);if(!value)throw Error('AuthProvider missing');return value;}
export const apiUrl=API;
