import { z } from "zod";
import { authConfig } from "./auth";
import { database } from "./server-db";
import { accountRoute,response,failure,withLock,type AccountProfile } from "./account-context";
import { GameError } from "./game-engine";
import { OFFERS,offerFor } from "./catalog";
import { isPremiumPack } from "./game-data";
import { limit } from "./server-security";
type Row=Record<string,any>;
const db=database;
const first=(sql:string,...args:any[])=>db().prepare(sql).bind(...args).first<Row>();
const run=(sql:string,...args:any[])=>db().prepare(sql).bind(...args).run();
const rows=async(sql:string,...args:any[])=>(await db().prepare(sql).bind(...args).all<Row>()).results;
const objectId=(v:any):string=>typeof v==="string"?v:v?.id??"";
export function billingConfig(){
 const e=authConfig(),mode=e.CKK_BILLING_MODE??"off";
 const validMode=mode==="test"||mode==="live";
 const ready=validMode&&!!e.STRIPE_SECRET_KEY?.startsWith(`sk_${mode}_`)&&!!e.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_")&&!!e.CKK_LEGAL_NAME&&!!e.CKK_SUPPORT_EMAIL&&!!e.CKK_APP_ORIGIN?.startsWith("https://")&&!!e.CKK_TERMS_URL?.startsWith("https://")&&e.CKK_BILLING_READY==="1";
 return {mode,ready,checkoutOpen:e.CKK_CHECKOUT_OPEN==="1",origin:e.CKK_APP_ORIGIN??"",secret:e.STRIPE_SECRET_KEY??"",webhook:e.STRIPE_WEBHOOK_SECRET??"",merchant:e.CKK_LEGAL_NAME??null,support:e.CKK_SUPPORT_EMAIL??null,terms:e.CKK_TERMS_URL??null};
}
function configured(){const c=billingConfig();if(!c.ready)throw new GameError(503,"Les achats ne sont pas encore ouverts. Le jeu gratuit reste disponible.");return c;}
/** Fixed provider origin and version; no card data enters our application. */
async function stripe(path:string,method="GET",params:Record<string,string>={},key?:string):Promise<Row>{
 const c=configured(),form=new URLSearchParams(params);let res:Response;
 try{res=await fetch("https://api.stripe.com/v1/"+path+(method==="GET"&&form.size?"?"+form:""),{method,headers:{Authorization:"Bearer "+c.secret,"Stripe-Version":"2025-04-30.basil",...(method!=="GET"?{"Content-Type":"application/x-www-form-urlencoded"}:{}),...(key?{"Idempotency-Key":key}:{})},body:method!=="GET"?form:undefined,signal:AbortSignal.timeout(8000)});}catch{throw new GameError(503,"Le service de paiement ne répond pas. Réessaie sans renouveler ton achat.");}
 if(!res.ok)throw new GameError(503,"Le service de paiement est momentanément indisponible.");return res.json();
}
function providerId(id:string,prefix:string){if(!new RegExp("^"+prefix+"_[A-Za-z0-9_]+$").test(id))throw new GameError(400,"Référence de paiement invalide.");return encodeURIComponent(id);}
export async function rights(profileId:string){
 const c=billingConfig();const entries=c.ready?await rows("SELECT kind,pack_id,expires_at FROM entitlements WHERE profile_id=? AND mode=? AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>?)",profileId,c.mode,Date.now()):[];
 const plus=entries.some(e=>e.kind==="plus"),passUntil=Math.max(0,...entries.filter(e=>e.kind==="pass").map(e=>e.expires_at));return {plus,passUntil,premium:plus||passUntil>Date.now(),packs:entries.filter(e=>e.kind==="pack").map(e=>e.pack_id as string)};
}
export async function requireRoomRights(profileId:string,pack:string,theme:string){const r=await rights(profileId);if(isPremiumPack(pack)&&!r.premium&&!r.packs.includes(pack))throw new GameError(402,"Ce pack demande un achat, un Party Pass ou C KI KA LA+. Choisis un pack gratuit pour jouer maintenant.");if(theme!=="neon"&&!r.premium)throw new GameError(402,"Les ambiances supplémentaires demandent un Party Pass ou C KI KA LA+.");}
async function grant(source:string,profile:string,kind:string,pack:string|null,until:number|null){await run("INSERT INTO entitlements(source_id,profile_id,kind,pack_id,expires_at,updated_at,mode) VALUES(?,?,?,?,?,?,?) ON CONFLICT(source_id) DO UPDATE SET expires_at=excluded.expires_at,updated_at=excluded.updated_at",source,profile,kind,pack,until,Date.now(),configured().mode);}
async function paymentState(pi:string){
 const p=await stripe("payment_intents/"+providerId(pi,"pi"),"GET",{"expand[]":"latest_charge"});const charge=p.latest_charge;
 return {paid:p.status==="succeeded",blocked:!!charge&&(!!charge.disputed||!!charge.refunded),customer:objectId(p.customer)};
}
async function revokePayment(pi:string){
 await run("INSERT INTO billing_payments(payment_id,revoked_at) VALUES(?,?) ON CONFLICT(payment_id) DO UPDATE SET revoked_at=excluded.revoked_at",pi,Date.now());
 await run("UPDATE billing_orders SET status='revoked',revoked_at=? WHERE payment_id=?",Date.now(),pi);
 await run("UPDATE entitlements SET revoked_at=? WHERE source_id IN (SELECT id FROM billing_orders WHERE payment_id=?)",Date.now(),pi);
 const payment=await first("SELECT subscription_id FROM billing_payments WHERE payment_id=?",pi);
 if(payment?.subscription_id)await blockSubscription(payment.subscription_id);
}
async function blockSubscription(subId:string){
 // A full refund or dispute ends access and renewal. Reinstatement is a new, explicit purchase.
 const sub=await stripe("subscriptions/"+providerId(subId,"sub"));if(sub.status!=="canceled")await stripe("subscriptions/"+providerId(subId,"sub"),"DELETE",{},"ckk-cancel-refund-"+subId);
 await db().batch([db().prepare("UPDATE billing_subscriptions SET status='canceled',blocked_at=?,updated_at=? WHERE id=?").bind(Date.now(),Date.now(),subId),db().prepare("UPDATE entitlements SET revoked_at=? WHERE source_id=?").bind(Date.now(),"sub:"+subId)]);
}
async function syncSubscription(subId:string){
 const s=await stripe("subscriptions/"+providerId(subId,"sub"));const order=await first("SELECT * FROM billing_orders WHERE id=? OR subscription_id=? LIMIT 1",s.metadata?.order_id??"",subId);if(!order||!order.profile_id)return;
 const c=configured(),offer=offerFor(order.sku),customer=await first("SELECT customer_id FROM billing_customers WHERE profile_id=? AND mode=?",order.profile_id,c.mode);
 if(!offer?.interval||order.mode!==c.mode||objectId(s.customer)!==customer?.customer_id||s.livemode!==(c.mode==="live"))throw new GameError(400,"Abonnement non reconnu.");
 const item=s.items?.data?.[0],price=item?.price;const until=Number(item?.current_period_end??s.current_period_end)*1000;
 if(s.items?.data?.length!==1||price?.unit_amount!==offer.cents||price?.currency!=="eur"||price?.recurring?.interval!==offer.interval||price?.recurring?.interval_count!==1||!Number.isFinite(until))throw new GameError(400,"Offre d’abonnement non reconnue.");
 await run("INSERT INTO billing_subscriptions(id,profile_id,status,period_end,cancel_at_period_end,updated_at,mode) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,period_end=excluded.period_end,cancel_at_period_end=excluded.cancel_at_period_end,updated_at=excluded.updated_at",subId,order.profile_id,s.status,until,s.cancel_at_period_end?1:0,Date.now(),c.mode);
 await run("UPDATE billing_orders SET subscription_id=? WHERE id=?",subId,order.id);
 let paid=false,blocked=!!(await first("SELECT blocked_at FROM billing_subscriptions WHERE id=?",subId))?.blocked_at;
 if(s.status==="active"&&!blocked&&s.latest_invoice){
  const invoice=await stripe("invoices/"+providerId(objectId(s.latest_invoice),"in"));
  if(invoice.status==="paid"&&invoice.amount_paid===offer.cents&&invoice.currency==="eur"){
   const payments=await stripe("invoice_payments","GET",{invoice:invoice.id,status:"paid",limit:"100"});
   if(payments.data?.length===1&&!payments.has_more){const pi=objectId(payments.data[0].payment?.payment_intent);if(pi){const state=await paymentState(pi);await run("INSERT INTO billing_payments(payment_id,subscription_id,order_id) VALUES(?,?,?) ON CONFLICT(payment_id) DO UPDATE SET subscription_id=excluded.subscription_id,order_id=excluded.order_id",pi,subId,order.id);blocked=state.blocked||!!(await first("SELECT revoked_at FROM billing_payments WHERE payment_id=?",pi))?.revoked_at;paid=state.paid&&state.customer===customer.customer_id;if(blocked){await revokePayment(pi);return;}}}
  }
 }
 if(paid&&!blocked&&until>Date.now()){
  await grant("sub:"+subId,order.profile_id,"plus",null,until);
  // Only a verified current invoice can restore an entitlement after a transient payment failure.
  await run("UPDATE entitlements SET revoked_at=NULL WHERE source_id=? AND NOT EXISTS(SELECT 1 FROM billing_subscriptions WHERE id=? AND blocked_at IS NOT NULL)","sub:"+subId,subId);
  await run("UPDATE billing_orders SET status='paid',paid_at=COALESCE(paid_at,?) WHERE id=? AND revoked_at IS NULL",Date.now(),order.id);
 }else await run("UPDATE entitlements SET revoked_at=? WHERE source_id=?",Date.now(),"sub:"+subId);
}
async function fulfillSession(sessionId:string){
 const s=await stripe("checkout/sessions/"+providerId(sessionId,"cs"));const order=await first("SELECT * FROM billing_orders WHERE id=?",s.client_reference_id??"");if(!order?.profile_id)return;
 const c=configured(),offer=offerFor(order.sku),customer=await first("SELECT customer_id FROM billing_customers WHERE profile_id=? AND mode=?",order.profile_id,c.mode);
 if(!offer||s.metadata?.order_id!==order.id||order.mode!==c.mode||s.livemode!==(c.mode==="live")||s.amount_total!==order.amount||s.currency!=="eur"||objectId(s.customer)!==customer?.customer_id||order.session_id&&order.session_id!==s.id)throw new GameError(400,"Paiement non reconnu.");
 if(s.status!=="complete"||s.payment_status!=="paid"||order.revoked_at)return;
 if(offer.kind==="plus"){if(s.mode!=="subscription")throw new GameError(400,"Offre invalide.");await syncSubscription(objectId(s.subscription));return;}
 if(s.mode!=="payment")throw new GameError(400,"Offre invalide.");const pi=objectId(s.payment_intent),state=await paymentState(pi);
 await run("UPDATE billing_orders SET session_id=?,payment_id=? WHERE id=?",s.id,pi,order.id);
 if(!state.paid||state.customer!==customer.customer_id)return;
 if(state.blocked||(await first("SELECT revoked_at FROM billing_payments WHERE payment_id=?",pi))?.revoked_at){await revokePayment(pi);return;}
 // The payment timestamp is immutable across retries and duplicate webhook deliveries.
 const paidAt=order.paid_at??Date.now();await db().batch([db().prepare("UPDATE billing_orders SET status='paid',paid_at=COALESCE(paid_at,?) WHERE id=? AND revoked_at IS NULL").bind(paidAt,order.id),db().prepare("INSERT INTO entitlements(source_id,profile_id,kind,pack_id,expires_at,updated_at,mode) VALUES(?,?,?,?,?,?,?) ON CONFLICT(source_id) DO NOTHING").bind(order.id,order.profile_id,offer.kind,offer.packId??null,offer.kind==="pass"?paidAt+86400000:null,Date.now(),c.mode)]);
}
export async function billingStatus(profileId:string){const c=billingConfig();return {access:await rights(profileId),orders:await rows("SELECT id,sku,amount,currency,status,created_at,paid_at FROM billing_orders WHERE profile_id=? AND mode=? ORDER BY created_at DESC LIMIT 30",profileId,c.mode),subscriptions:await rows("SELECT id,status,period_end,cancel_at_period_end FROM billing_subscriptions WHERE profile_id=? AND mode=? ORDER BY updated_at DESC LIMIT 10",profileId,c.mode)};}
async function checkout(p:AccountProfile,body:Record<string,unknown>){
 const data=z.object({sku:z.string(),acceptTerms:z.literal(true)}).strict().parse(body),c=configured();if(!c.checkoutOpen)throw new GameError(503,"Les nouveaux achats sont momentanément fermés. Tes accès existants restent disponibles.");const offer=offerFor(data.sku);if(!offer)throw new GameError(400,"Offre introuvable.");await limit(db(),"checkout:"+p.id,10,600000);
 return withLock("billing:"+p.id,async()=>{
  const r=await rights(p.id);if(offer.kind==="pack"&&(r.packs.includes(offer.packId!)||r.premium)||offer.kind==="pass"&&r.premium||offer.kind==="plus"&&r.plus)throw new GameError(409,"Tu disposes déjà de cet accès. Consulte tes achats.");
  if(offer.kind==="plus"&&await first("SELECT id FROM billing_subscriptions WHERE profile_id=? AND mode=? AND status NOT IN ('canceled','incomplete_expired')",p.id,c.mode))throw new GameError(409,"Gère ton abonnement existant avant d’en ouvrir un autre.");
  let customer=await first("SELECT customer_id,mode FROM billing_customers WHERE profile_id=?",p.id);if(customer&&customer.mode!==c.mode)throw new GameError(409,"Ton compte utilise un autre environnement de paiement. Contacte le support.");
  if(!customer){const created=await stripe("customers","POST",{"metadata[profile_id]":p.id},`ckk-customer-${c.mode}-${p.id}`);await run("INSERT INTO billing_customers(profile_id,customer_id,mode) VALUES(?,?,?)",p.id,created.id,c.mode);customer={customer_id:created.id};}
  let order=await first("SELECT * FROM billing_orders WHERE profile_id=? AND mode=? AND status='pending' AND created_at>? AND (sku=? OR (sku LIKE 'plus-%' AND ? LIKE 'plus-%')) ORDER BY created_at DESC LIMIT 1",p.id,c.mode,Date.now()-86400000,offer.id,offer.id);
  if(order?.session_id){const session=await stripe("checkout/sessions/"+providerId(order.session_id,"cs"));if(session.status==="open"&&order.sku===offer.id)return {url:safeUrl(session.url,"checkout.stripe.com"),orderId:order.id};if(session.status==="open")await stripe("checkout/sessions/"+providerId(session.id,"cs")+"/expire","POST",{},"ckk-switch-"+order.id);if(session.status==="complete"){await fulfillSession(session.id);throw new GameError(409,"Ce paiement est déjà terminé. Consulte tes achats.");}await run("UPDATE billing_orders SET status='expired' WHERE id=?",order.id);order=null;}
  if(!order){order={id:crypto.randomUUID(),sku:offer.id};await run("INSERT INTO billing_orders(id,profile_id,sku,amount,currency,mode,created_at,terms_url,terms_accepted_at) VALUES(?,?,?,?,?,?,?,?,?)",order.id,p.id,offer.id,offer.cents,"eur",c.mode,Date.now(),c.terms,Date.now());}
  const chosen=offerFor(order.sku)!;const params:Record<string,string>={customer:customer.customer_id,mode:chosen.interval?"subscription":"payment",client_reference_id:order.id,"metadata[order_id]":order.id,"line_items[0][price_data][currency]":"eur","line_items[0][price_data][unit_amount]":String(chosen.cents),"line_items[0][price_data][product_data][name]":chosen.name,"line_items[0][quantity]":"1","payment_method_types[0]":"card",success_url:c.origin+"/offers?order="+order.id,cancel_url:c.origin+"/offers?cancelled=1",billing_address_collection:"required","custom_text[submit][message]":"En payant, tu acceptes les conditions de vente disponibles sur notre site. "+(chosen.interval?"Renouvellement automatique ; résiliation depuis ton compte.":"Paiement unique.")};
  if(chosen.interval){params["line_items[0][price_data][recurring][interval]"]=chosen.interval;params["subscription_data[metadata][order_id]"]=order.id;}else params["payment_intent_data[metadata][order_id]"]=order.id;
  const session=await stripe("checkout/sessions","POST",params,"ckk-checkout-"+order.id);await run("UPDATE billing_orders SET session_id=? WHERE id=?",session.id,order.id);return {url:safeUrl(session.url,"checkout.stripe.com"),orderId:order.id};
 });
}
function safeUrl(value:string,host:string){const u=new URL(value);if(u.protocol!=="https:"||u.hostname!==host)throw new GameError(503,"Lien de paiement indisponible.");return u.href;}
export async function cancelAccountSubscriptions(profileId:string){
 const pending=await rows("SELECT id,session_id FROM billing_orders WHERE profile_id=? AND status='pending' AND session_id IS NOT NULL",profileId);
 for(const order of pending){const s=await stripe("checkout/sessions/"+providerId(order.session_id,"cs"));if(s.status==="open")await stripe("checkout/sessions/"+providerId(s.id,"cs")+"/expire","POST",{},"ckk-expire-delete-"+order.id);else if(s.status==="complete")await fulfillSession(s.id);await run("UPDATE billing_orders SET status='expired' WHERE id=? AND status='pending'",order.id);}

 const subscriptions=await rows("SELECT id FROM billing_subscriptions WHERE profile_id=? AND status NOT IN ('canceled','incomplete_expired')",profileId);for(const sub of subscriptions){await stripe("subscriptions/"+providerId(sub.id,"sub"),"DELETE",{},"ckk-delete-account-"+sub.id);await run("UPDATE billing_subscriptions SET status='canceled' WHERE id=?",sub.id);}
}
export async function billingRoute(request:Request,path:string[]){
 if(path.join("/")==="webhook"&&request.method==="POST")return webhook(request);
 if(path.join("/")==="catalog"&&request.method==="GET"){const c=billingConfig();return response({offers:OFFERS,ready:c.ready&&c.checkoutOpen,mode:c.mode,merchant:c.merchant,support:c.support,terms:c.terms});}
 return accountRoute(request,async(p,body)=>{
  const action=path.join("/");if(action==="status"&&request.method==="GET")return billingStatus(p.id);
  if(action==="checkout"&&request.method==="POST")return checkout(p,body);
  if(action==="reconcile"&&request.method==="POST"){const id=z.string().uuid().parse(body.orderId);await limit(db(),"reconcile:"+p.id,12);return withLock("billing:"+p.id,async()=>{const order=await first("SELECT session_id FROM billing_orders WHERE id=? AND profile_id=? AND mode=?",id,p.id,configured().mode);if(!order?.session_id)throw new GameError(404,"Achat introuvable.");await fulfillSession(order.session_id);return billingStatus(p.id);});}
  if(action==="portal"&&request.method==="POST"){const c=configured(),customer=await first("SELECT customer_id FROM billing_customers WHERE profile_id=? AND mode=?",p.id,c.mode);if(!customer)throw new GameError(404,"Aucun achat à gérer.");const portal=await stripe("billing_portal/sessions","POST",{customer:customer.customer_id,return_url:c.origin+"/offers"});return {url:safeUrl(portal.url,"billing.stripe.com")};}
  throw new GameError(404,"Ressource introuvable.");
 });
}
async function signedEvent(request:Request){
 const config=configured(),signature=request.headers.get("stripe-signature")??"";if(signature.length>4096)throw new GameError(400,"Signature invalide.");const fields=signature.split(",").map(v=>v.split("="));const stamp=fields.find(v=>v[0]==="t")?.[1];if(!stamp||!/^\d+$/.test(stamp)||Math.abs(Date.now()/1000-Number(stamp))>300)throw new GameError(400,"Signature expirée.");
 const reader=request.body?.getReader();if(!reader)throw new GameError(400,"Corps vide.");let size=0;const chunks:Uint8Array[]=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>131072){await reader.cancel();throw new GameError(413,"Événement trop volumineux.");}chunks.push(value);}const raw=new Uint8Array(size);let offset=0;for(const a of chunks){raw.set(a,offset);offset+=a.length;}const body=new TextDecoder("utf-8",{fatal:true}).decode(raw);
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(config.webhook),{name:"HMAC",hash:"SHA-256"},false,["verify"]);let valid=false;for(const [,hex] of fields.filter(v=>v[0]==="v1"&&/^[a-f0-9]{64}$/.test(v[1]))){const mac=Uint8Array.from(hex.match(/../g)!,v=>parseInt(v,16));if(await crypto.subtle.verify("HMAC",key,mac,new TextEncoder().encode(stamp+"."+body)))valid=true;}if(!valid)throw new GameError(400,"Signature invalide.");let event:Row;try{event=JSON.parse(body);}catch{throw new GameError(400,"Événement invalide.");}if(!/^evt_[A-Za-z0-9]+$/.test(event.id)||event.livemode!==(config.mode==="live")||typeof event.type!=="string")throw new GameError(400,"Événement invalide.");return event;
}
async function webhook(request:Request){
 try{const event=await signedEvent(request);if(await first("SELECT id FROM billing_events WHERE id=?",event.id))return response({received:true});const obj=event.data?.object??{};
  const customerId=objectId(obj.customer);let owner=customerId?await first("SELECT profile_id FROM billing_customers WHERE customer_id=?",customerId):null;
  if(!owner&&obj.id?.startsWith("cs_")){const order=await first("SELECT profile_id FROM billing_orders WHERE id=?",obj.client_reference_id??"");owner=order;}
  if(!owner&&obj.charge){const charge=await stripe("charges/"+providerId(objectId(obj.charge),"ch"));owner=await first("SELECT profile_id FROM billing_customers WHERE customer_id=?",objectId(charge.customer));}
  if(!owner)return response({received:true});
  await withLock("billing:"+owner.profile_id,async()=>{
   if(await first("SELECT id FROM billing_events WHERE id=?",event.id))return;
   if(["checkout.session.completed","checkout.session.async_payment_succeeded"].includes(event.type))await fulfillSession(obj.id);
   else if(event.type.startsWith("customer.subscription."))await syncSubscription(obj.id);
   else if(["invoice.paid","invoice.payment_failed"].includes(event.type)){const invoice=await stripe("invoices/"+providerId(obj.id,"in"));const sub=objectId(invoice.parent?.subscription_details?.subscription??invoice.subscription);if(sub)await syncSubscription(sub);}
   else if(["charge.refunded","charge.dispute.created","charge.dispute.closed"].includes(event.type)){
    const charge=await stripe("charges/"+providerId(event.type==="charge.refunded"?obj.id:objectId(obj.charge),"ch"));const pi=objectId(charge.payment_intent);
    if(pi&&(charge.refunded||charge.disputed)){
     // Reverse lookup also covers a refund arriving before invoice.paid.
     const payments=await stripe("invoice_payments","GET",{"payment[type]":"payment_intent","payment[payment_intent]":pi,limit:"100"});
     if(payments.has_more||(payments.data?.length??0)>1)throw new GameError(503,"Paiement à vérifier auprès du support.");for(const payment of payments.data??[]){const invoice=await stripe("invoices/"+providerId(objectId(payment.invoice),"in"));const sub=objectId(invoice.parent?.subscription_details?.subscription??invoice.subscription);if(sub){await run("INSERT INTO billing_payments(payment_id,subscription_id) VALUES(?,?) ON CONFLICT(payment_id) DO UPDATE SET subscription_id=excluded.subscription_id",pi,sub);}}
     await revokePayment(pi);
    }
   }
   await run("INSERT OR IGNORE INTO billing_events(id,type,processed_at) VALUES(?,?,?)",event.id,event.type,Date.now());
  });return response({received:true});
 }catch(e){if(e instanceof GameError&&e.status===409)return response({error:"Réessaie cet événement."},503);return failure(e);}
}
