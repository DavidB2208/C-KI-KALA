/** Worker/D1 + a deterministic Stripe HTTP stand-in. No Stripe keys or real charges. */
import { createRequire } from 'node:module';
import { readdir,readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHmac,randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.resolve('wrangler/package.json')),{Miniflare}=require('miniflare');
const root=resolve('dist/server'),origin='https://billing.example.test',secret='whsec_isolated_tests_only';
const objects=new Map(),requests=[];let seq=0,unavailable=false;
const answer=o=>new Response(JSON.stringify(o),{headers:{'Content-Type':'application/json'}});
async function provider(req){
 const u=new URL(req.url);assert.equal(u.origin,'https://api.stripe.com');assert.equal(req.headers.get('stripe-version'),'2025-04-30.basil');
 if(unavailable)return new Response('unavailable',{status:503});
 const path=u.pathname.slice(4),form=new URLSearchParams(await req.text());requests.push({path,method:req.method,form});
 if(path==='customers'&&req.method==='POST'){const o={id:'cus_test'+(++seq)};objects.set(o.id,o);return answer(o);}
 if(path==='checkout/sessions'&&req.method==='POST'){
  const id='cs_test_session'+(++seq),o={id,url:'https://checkout.stripe.com/c/pay/'+id,status:'open',payment_status:'unpaid',mode:form.get('mode'),client_reference_id:form.get('client_reference_id'),metadata:{order_id:form.get('metadata[order_id]')},customer:form.get('customer'),livemode:false,amount_total:Number(form.get('line_items[0][price_data][unit_amount]')),currency:form.get('line_items[0][price_data][currency]'),interval:form.get('line_items[0][price_data][recurring][interval]')};objects.set(id,o);return answer(o);
 }
 if(path==='billing_portal/sessions')return answer({url:'https://billing.stripe.com/p/session/test'});
 if(path==='invoice_payments'){const invoice=u.searchParams.get('invoice'),pi=u.searchParams.get('payment[payment_intent]');return answer({data:[...objects.values()].filter(o=>o.object==='invoice_payment'&&(invoice?o.invoice===invoice:o.payment.payment_intent===pi)),has_more:false});}
 const id=path.split('/').at(-1)==='expire'?path.split('/').at(-2):path.split('/').at(-1),o=objects.get(id);
 if(!o)throw Error('Unexpected provider object '+path);
 if(path.endsWith('/expire'))o.status='expired';
 if(req.method==='DELETE')o.status='canceled';
 return answer(o);
}
const mf=new Miniflare({host:'127.0.0.1',cf:false,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'billing-tests'},bindings:{BETTER_AUTH_SECRET:randomBytes(32).toString('hex'),CKK_APP_ORIGIN:origin,CKK_BILLING_MODE:'test',CKK_BILLING_READY:'1',CKK_CHECKOUT_OPEN:'1',STRIPE_SECRET_KEY:'rk_test_isolated_not_real',STRIPE_WEBHOOK_SECRET:secret,CKK_LEGAL_NAME:'Tests uniquement',CKK_SUPPORT_EMAIL:'tests@example.test',CKK_TERMS_URL:origin+'/conditions'},outboundService:provider,modulesRoot:root,modules:[{type:'ESModule',path:resolve(root,'billing-test-entry.js'),contents:`import app from './index.js';export default {async fetch(r,e,c){if(new URL(r.url).pathname==='/fixture'){const {sql,params=[]}=await r.json();return Response.json((await e.DB.prepare(sql).bind(...params).all()).results);}return app.fetch(r,e,c);}};`},...(await readdir(root,{recursive:true})).filter(p=>/\.m?js$/.test(p)).map(p=>({type:'ESModule',path:resolve(root,p)}))]});
let passed=0;
function check(name,value){assert.ok(value,name);passed++;console.log('PASS',name);}
async function sql(q,...params){const r=await mf.dispatchFetch(origin+'/fixture',{method:'POST',body:JSON.stringify({sql:q,params})});assert.equal(r.status,200,await r.clone().text());return r.json();}
let clientSeq=0;
class Client{
 cookies=new Map();n=++clientSeq;password='Une phrase de test assez longue 2026!';
 async call(path,method='GET',body={},extra={}){const r=await mf.dispatchFetch(origin+'/api/'+path,{method,headers:{Cookie:[...this.cookies].map(([k,v])=>k+'='+v).join('; '),'CF-Connecting-IP':'198.51.100.'+this.n,...(method==='GET'?{}:{Origin:origin,'Content-Type':'application/json','X-CKK-Request':'1'}),...extra},...(method==='GET'?{}:{body:JSON.stringify(body)})});for(const cookie of r.headers.getSetCookie()){const f=cookie.split(';')[0],i=f.indexOf('=');this.cookies.set(f.slice(0,i),f.slice(i+1));}return {status:r.status,data:await r.json()};}
 async ok(...args){const r=await this.call(...args);assert.equal(r.status,200,JSON.stringify(r.data));return r.data;}
 async register(){await this.ok('auth/sign-up/email','POST',{name:'Paiement '+this.n,email:'billing'+this.n+'@example.test',password:this.password});this.id=(await this.ok('me')).profile.id;}
}
function pay(session){session.status='complete';session.payment_status='paid';const pi='pi_test'+(++seq),charge={id:'ch_test'+seq,customer:session.customer,payment_intent:pi,refunded:false,disputed:false};objects.set(charge.id,charge);objects.set(pi,{id:pi,status:'succeeded',customer:session.customer,latest_charge:charge});session.payment_intent=pi;if(session.mode==='subscription'){
 const sub='sub_test'+seq,invoice='in_test'+seq;session.subscription=sub;
 objects.set(sub,{id:sub,customer:session.customer,livemode:false,metadata:session.metadata,status:'active',cancel_at_period_end:false,items:{data:[{current_period_end:Math.floor(Date.now()/1000)+2592000,price:{unit_amount:session.amount_total,currency:'eur',recurring:{interval:session.interval,interval_count:1}}}]},latest_invoice:invoice});
 objects.set(invoice,{id:invoice,status:'paid',amount_paid:session.amount_total,currency:'eur',customer:session.customer,parent:{subscription_details:{subscription:sub}}});objects.set('inpay_test'+seq,{object:'invoice_payment',id:'inpay_test'+seq,invoice,payment:{type:'payment_intent',payment_intent:pi},status:'paid'});
 }return session;
}
let eventSeq=0;
async function event(type,obj,{id='evt_test'+(++eventSeq),age=0,valid=true,livemode=false}={}){const body=JSON.stringify({id,type,livemode,data:{object:obj}}),t=Math.floor(Date.now()/1000)-age;const sig=createHmac('sha256',valid?secret:'wrong').update(t+'.'+body).digest('hex');const r=await mf.dispatchFetch(origin+'/api/billing/webhook',{method:'POST',headers:{'Content-Type':'application/json','Stripe-Signature':`t=${t},v1=${sig}`},body});return {status:r.status,data:await r.json()};}
async function checkout(c,sku){const r=await c.ok('billing/checkout','POST',{sku,acceptTerms:true});const order=(await sql('SELECT * FROM billing_orders WHERE id=?',r.orderId))[0];return {r,order,s:objects.get(order.session_id)};}
const setting={pack:'anime',roundCount:1,duration:120};
try{
 await mf.ready;for(const path of (await readdir('drizzle')).filter(p=>p.endsWith('.sql')).sort())for(const q of (await readFile('drizzle/'+path,'utf8')).split('--> statement-breakpoint').filter(s=>s.trim()))await sql(q);
 const a=new Client(),b=new Client();await a.register();await b.register();
 check('Configured test catalogue opens with a restricted key without exposing it',(await a.ok('billing/catalog')).ready&&!JSON.stringify(await a.ok('billing/catalog')).includes('rk_test'));
 check('Price injection rejected',(await a.call('billing/checkout','POST',{sku:'party',acceptTerms:true,amount:1})).status===400);
 check('Terms must be accepted',(await a.call('billing/checkout','POST',{sku:'party',acceptTerms:false})).status===400);
 check('Checkout rejects foreign origin',(await a.call('billing/checkout','POST',{sku:'party',acceptTerms:true},{Origin:'https://evil.test'})).status===403);
 const pass=await checkout(a,'party');
 check('Price and callback belong to server',pass.order.amount===299&&pass.order.currency==='eur'&&pass.s.amount_total===299&&requests.find(r=>r.path==='checkout/sessions').form.get('success_url')===origin+'/offers?order='+pass.order.id);
 check('Terms acceptance recorded',pass.order.terms_url===origin+'/conditions'&&pass.order.terms_accepted_at>0);
 check('Pending checkout does not unlock premium',!(await a.ok('billing/status')).access.premium&&(await a.call('rooms','POST',setting)).status===402);
 check('Repeated pending checkout reuses session',(await checkout(a,'party')).r.orderId===pass.order.id);
 check('Different account cannot reconcile order',(await b.call('billing/reconcile','POST',{orderId:pass.order.id})).status===404);
 check('Unpaid return never grants access',!(await a.ok('billing/reconcile','POST',{orderId:pass.order.id})).access.premium);
 pay(pass.s);
 check('Bad signature rejected',(await event('checkout.session.completed',pass.s,{valid:false})).status===400);
 check('Old timestamp rejected',(await event('checkout.session.completed',pass.s,{age:301})).status===400);
 check('Live event rejected in test mode',(await event('checkout.session.completed',pass.s,{livemode:true})).status===400);
 const delivered=await event('checkout.session.completed',pass.s,{id:'evt_duplicate'});check('Signed paid session activates access',delivered.status===200&&(await a.ok('billing/status')).access.premium);
 const access=(await a.ok('billing/status')).access,expires=access.passUntil;
 check('Pass lasts 24 hours from verified fulfillment',Math.abs(expires-Date.now()-86400000)<5000);
 await event('checkout.session.completed',pass.s,{id:'evt_duplicate'});await event('checkout.session.completed',pass.s);
 check('Duplicate and repeated events never extend pass',(await a.ok('billing/status')).access.passUntil===expires&&(await sql('SELECT * FROM entitlements WHERE source_id=?',pass.order.id)).length===1);
 check('Only buyer receives rights',!(await b.ok('billing/status')).access.premium);
 check('Cannot repurchase an already active pass',(await a.call('billing/checkout','POST',{sku:'party',acceptTerms:true})).status===409);
 const room='rooms/'+(await a.ok('rooms','POST',{...setting,visualTheme:'aurora'})).code;
 const g=new Client();await g.ok('profile','POST',{name:'Invite paiement'});await b.ok(room+'/join','POST');await g.ok(room+'/join','POST');await a.ok(room+'/start','POST');
 check('Paid host shares full premium content with free guests',(await g.ok(room)).question.length>6&&(await g.ok(room)).visualTheme==='aurora');
 await sql('UPDATE entitlements SET expires_at=0 WHERE profile_id=?',a.id);
 check('Expired rights block new premium rooms',(await a.call('rooms','POST',setting)).status===402);
 check('Started premium game survives pass expiry',(await g.ok(room)).status==='voting');
 for(const c of [a,b,g])await c.ok(room+'/vote','POST',{round:1,rankings:{},abstain:true});await a.ok(room+'/next','POST',{round:1});
 check('Expired host cannot carry premium into rematch',(await a.call(room+'/rematch','POST')).status===402);
 const pack=await checkout(b,'pack-anime');pay(pack.s);await event('checkout.session.completed',pack.s);
 check('Single pack grants only purchased pack',(await b.ok('billing/status')).access.packs.join()==='anime'&&!(await b.ok('billing/status')).access.premium&&(await b.call('rooms','POST',{...setting,pack:'campus'})).status===402);
 const packRoom='rooms/'+(await b.ok('rooms','POST',setting)).code;await a.ok(packRoom+'/join','POST');await g.ok(packRoom+'/join','POST');
 objects.get(pack.s.payment_intent).latest_charge.refunded=true;await event('charge.refunded',objects.get(pack.s.payment_intent).latest_charge);
 check('Full refund revokes purchased pack',!(await b.ok('billing/status')).access.packs.includes('anime'));
 check('Rights rechecked when starting lobby',(await b.call(packRoom+'/start','POST')).status===402);
 await event('checkout.session.completed',pack.s);check('Late checkout event cannot restore refunded pack',!(await b.ok('billing/status')).access.packs.includes('anime'));
 for(const c of [a,b,g])await c.ok(packRoom+'/leave','POST');
 const subscriber=new Client();await subscriber.register();const subOrder=await checkout(subscriber,'plus-month');pay(subOrder.s);const sub=objects.get(subOrder.s.subscription);
 await event('customer.subscription.created',sub);check('Subscription supports webhook before checkout completion',(await subscriber.ok('billing/status')).access.plus);
 await event('checkout.session.completed',subOrder.s);check('Subscription status persisted',(await subscriber.ok('billing/status')).subscriptions[0].status==='active');
 check('Active subscription blocks second subscription',(await subscriber.call('billing/checkout','POST',{sku:'plus-year',acceptTerms:true})).status===409);
 check('Billing portal uses own customer',(await subscriber.ok('billing/portal','POST')).url.startsWith('https://billing.stripe.com/')&&requests.at(-1).form.get('customer')===sub.customer);
 sub.cancel_at_period_end=true;await event('customer.subscription.updated',sub);check('End-of-period cancellation preserves prepaid access',(await subscriber.ok('billing/status')).access.plus&&(await subscriber.ok('billing/status')).subscriptions[0].cancel_at_period_end===1);
 sub.status='past_due';await event('customer.subscription.updated',sub);check('Failed subscription payment removes premium',!(await subscriber.ok('billing/status')).access.plus);
 sub.status='active';await event('invoice.paid',objects.get(sub.latest_invoice));check('Verified payment recovery restores access',(await subscriber.ok('billing/status')).access.plus);
 objects.get(subOrder.s.payment_intent).latest_charge.disputed=true;await event('charge.dispute.created',{id:'dp_test',charge:objects.get(subOrder.s.payment_intent).latest_charge.id});
 check('Dispute revokes subscription and stops renewal',!(await subscriber.ok('billing/status')).access.plus&&sub.status==='canceled');
 await event('customer.subscription.updated',sub);check('Later events cannot reopen disputed subscription',!(await subscriber.ok('billing/status')).access.plus);
 const deletion=new Client();await deletion.register();const pendingSub=await checkout(deletion,'plus-year');pay(pendingSub.s);
 unavailable=true;check('Provider outage blocks deletion with uncertain recurring payment',(await deletion.call('account','DELETE',{confirmation:'SUPPRIMER',password:deletion.password})).status===503&&(await deletion.ok('me')).signedIn);unavailable=false;
 await deletion.ok('account','DELETE',{confirmation:'SUPPRIMER',password:deletion.password});check('Deletion reconciles pending paid subscription and cancels renewal',objects.get(pendingSub.s.subscription).status==='canceled'&&!(await deletion.ok('me')).signedIn);
 check('Deleted account order is dissociated',(await sql('SELECT profile_id FROM billing_orders WHERE id=?',pendingSub.order.id))[0].profile_id===null);
 const wrong=new Client();await wrong.register();const altered=await checkout(wrong,'party');pay(altered.s);altered.s.amount_total=1;
 check('Wrong authoritative amount never grants access',(await event('checkout.session.completed',altered.s)).status===400&&!(await wrong.ok('billing/status')).access.premium);
 const race=new Client();await race.register();const concurrent=await Promise.all([race.call('billing/checkout','POST',{sku:'party',acceptTerms:true}),race.call('billing/checkout','POST',{sku:'party',acceptTerms:true})]);
 check('Concurrent checkout cannot create two orders',concurrent.some(r=>r.status===200)&&(await sql('SELECT id FROM billing_orders WHERE profile_id=?',race.id)).length===1);
 console.log(JSON.stringify({passed,test:'Built Worker + isolated D1 + simulated Stripe HTTPS responses'}));
}finally{await mf.dispose();}
