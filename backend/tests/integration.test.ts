import 'dotenv/config';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {setTimeout as sleep} from 'node:timers/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import {PrismaClient} from '@prisma/client';

/**
 * This suite intentionally runs only against a disposable PostgreSQL database.
 * Set TEST_DATABASE_IS_DISPOSABLE=yes and DATABASE_URL to the test instance.
 * A local API process is spawned and shut down in finally.
 */
test('end-to-end local API: registration, ownership, stock and unpaid checkout', {timeout:90000}, async()=>{
 assert.equal(process.env.TEST_DATABASE_IS_DISPOSABLE,'yes','Refusing to run destructive test without disposable database flag');
 const db=new PrismaClient();
 const port=Number(process.env.TEST_API_PORT??'5099');
 const origin='http://localhost:5173';
 const base='http://127.0.0.1:'+port;
 const proc=spawn(process.execPath,['--import','tsx','src/index.ts'],{cwd:process.cwd(),env:{...process.env,PORT:String(port),FRONTEND_ORIGIN:origin,NODE_ENV:'test',DELIVERY_FEE:'0.00'},stdio:['ignore','pipe','pipe']});
 let logs='';
 proc.stdout.on('data',b=>{logs+=String(b);});proc.stderr.on('data',b=>{logs+=String(b);});
 const api=async(path:string,opts:RequestInit={},token?:string)=>{
  const result=await fetch(base+path,{...opts,headers:{'Content-Type':'application/json',Origin:origin,...opts.headers,...(token?{Authorization:'Bearer '+token}:{})}});
  const body=await result.json().catch(()=>null);
  return {status:result.status,body,headers:result.headers};
 };
 try{
  let ready=false;
  for(let i=0;i<80;i++){
   if(proc.exitCode!==null)throw Error('Backend process exited early: '+logs);
   try{const r=await fetch(base+'/api/health');if(r.ok){ready=true;break;}}catch{}
   await sleep(250);
  }
  assert.ok(ready,'API failed health check: '+logs);
  const email='ci-'+randomUUID()+'@example.test';
  const reg=await api('/api/auth/register',{method:'POST',body:JSON.stringify({name:'CI Test Customer',email,password:'Test-only-passphrase-4567'})});
  assert.equal(reg.status,201,JSON.stringify(reg.body));
  assert.equal(reg.body.user.role,'CUSTOMER');
  assert.ok(reg.body.accessToken);
  assert.equal(reg.body.user.passwordHash,undefined);
  const token=reg.body.accessToken as string;
  const admin=await api('/api/admin/stats',{},token);
  assert.equal(admin.status,403,'A new customer must never see admin stats.');
  const other=await api('/api/me/orders',{},'invalid');
  assert.equal(other.status,401);
  const address=await api('/api/me/addresses',{method:'POST',body:JSON.stringify({recipient:'Test Buyer',line1:'Test Lane',city:'Hyderabad',state:'Telangana',postalCode:'500001',isDefault:true})},token);
  assert.equal(address.status,201,JSON.stringify(address.body));
  const products=await db.product.findMany({where:{active:true,variants:{none:{}}},take:1,orderBy:{id:'asc'}});
  assert.ok(products.length,'Seed must create at least one active product.');
  const product=products[0];
  await db.inventory.upsert({where:{productId:product.id},create:{productId:product.id,quantity:2},update:{quantity:2}});
  const add=await api('/api/cart/items',{method:'POST',body:JSON.stringify({productId:product.id,quantity:1})},token);
  assert.equal(add.status,201,JSON.stringify(add.body));
  const cart=await api('/api/cart',{},token);assert.equal(cart.status,200);assert.equal(cart.body.items.length,1);
  const order=await api('/api/orders',{method:'POST',headers:{'Idempotency-Key':randomUUID()},body:JSON.stringify({addressId:address.body.id,paymentMethod:'COD'})},token);
  assert.equal(order.status,201,JSON.stringify(order.body));
  assert.equal(order.body.paymentStatus,'PENDING');
  assert.equal(Number(order.body.total),Number(product.price));
  const quantity=await db.inventory.findUnique({where:{productId:product.id}});
  assert.equal(quantity?.quantity,1,'An order must decrement inventory atomically.');
  const second=await api('/api/orders',{method:'POST',headers:{'Idempotency-Key':randomUUID()},body:JSON.stringify({addressId:address.body.id,paymentMethod:'COD'})},token);
  assert.equal(second.status,400,'An empty cart must not create a duplicate order.');
  const withVariant=await db.product.findFirst({
   where:{active:true,variants:{some:{}}},
   include:{variants:true}
  });
  if(withVariant){
   const option=withVariant.variants[0];
   await db.inventory.upsert({where:{productId:withVariant.id},create:{productId:withVariant.id,quantity:3},update:{quantity:3}});
   const missingVariant=await api('/api/cart/items',{method:'POST',body:JSON.stringify({productId:withVariant.id,quantity:1})},token);
   assert.equal(missingVariant.status,400,'Variant product must require a variant selection.');
   const optionAdd=await api('/api/cart/items',{method:'POST',body:JSON.stringify({productId:withVariant.id,variantId:option.id,quantity:2})},token);
   assert.equal(optionAdd.status,201,JSON.stringify(optionAdd.body));
   const variantOrder=await api('/api/orders',{method:'POST',headers:{'Idempotency-Key':randomUUID()},body:JSON.stringify({addressId:address.body.id,paymentMethod:'COD'})},token);
   assert.equal(variantOrder.status,201,JSON.stringify(variantOrder.body));
   assert.equal(Number(variantOrder.body.total),Number(option.price)*2);
   assert.equal(variantOrder.body.items[0].variantId,option.id);
  }
  const customerOrders=await api('/api/me/orders',{},token);
  assert.equal(customerOrders.status,200);
  assert.equal(customerOrders.body.length,withVariant?2:1);
  const ownedOrder=await api('/api/me/orders/'+order.body.id,{},token);
  assert.equal(ownedOrder.status,200);
  const another=await api('/api/auth/register',{method:'POST',body:JSON.stringify({
   name:'Second Test Customer',
   email:'ci-'+randomUUID()+'@example.test',
   password:'Test-only-passphrase-4567'
  })});
  assert.equal(another.status,201);
  const forbiddenOrder=await api('/api/me/orders/'+order.body.id,{},another.body.accessToken);
  assert.equal(forbiddenOrder.status,404,'Another customer must not see this order.');
  const relog=await api('/api/auth/login',{method:'POST',body:JSON.stringify({email,password:'Test-only-passphrase-4567'})});
  assert.equal(relog.status,200);
  assert.equal(relog.body.user.role,'CUSTOMER');
  const wrongPassword=await api('/api/me/password',{method:'POST',body:JSON.stringify({
   currentPassword:'definitely-wrong',newPassword:'Another-secure-passphrase-78'
  })},token);
  assert.equal(wrongPassword.status,403);
  const changedPassword=await api('/api/me/password',{method:'POST',body:JSON.stringify({
   currentPassword:'Test-only-passphrase-4567',newPassword:'Another-secure-passphrase-78'
  })},token);
  assert.equal(changedPassword.status,200,JSON.stringify(changedPassword.body));
  const oldLogin=await api('/api/auth/login',{method:'POST',body:JSON.stringify({
   email,password:'Test-only-passphrase-4567'
  })});
  assert.equal(oldLogin.status,401,'Old password must stop working.');
  const newLogin=await api('/api/auth/login',{method:'POST',body:JSON.stringify({
   email,password:'Another-secure-passphrase-78'
  })});
  assert.equal(newLogin.status,200,'New password must work.');

 }finally{
  proc.kill();
  await db.$disconnect();
 }
});
