import { z } from "zod";
import { hashPassword,verifyPassword,constantTimeEqual } from "better-auth/crypto";
import { authFor,authConfig,identity } from "./auth";
import { database } from "./server-db";
import { GameError } from "./game-engine";
import { guestCookieName,readCookie } from "./session-scope";
import { nameSchema,emailSchema,passwordSchema,sha256,randomSecret,guardRequest,limitedJson,limit } from "./server-security";

const signup=z.object({name:nameSchema,email:emailSchema,password:passwordSchema,setupCode:z.string().max(100).optional()}).strict();
const signin=z.object({email:emailSchema,password:z.string().min(1).max(128)}).strict();
const recovery=z.object({email:emailSchema,code:z.string().min(1).max(100),newPassword:passwordSchema}).strict();
const json=(data:unknown,status=200,headers?:Headers)=>{const h=new Headers(headers);h.set("Cache-Control","no-store, private");h.set("X-Content-Type-Options","nosniff");return Response.json(data,{status,headers:h});};
function responseError(code?:string){
 const messages:Record<string,string>={INVALID_EMAIL_OR_PASSWORD:"E-mail ou mot de passe incorrect.",USER_ALREADY_EXISTS:"Impossible de créer ce compte. Essaie de te connecter.",USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:"Impossible de créer ce compte. Essaie de te connecter.",INVALID_PASSWORD:"Mot de passe incorrect.",PASSWORD_TOO_SHORT:"Choisis au moins 12 caractères.",SESSION_EXPIRED:"Reconnecte-toi pour continuer.",UNAUTHORIZED:"Connecte-toi pour continuer."};
 return messages[code??""]??"La connexion a échoué. Vérifie tes informations et réessaie.";
}
async function checkSetup(code:string|undefined){
 const c=authConfig();if(!c.CKK_OWNER_SETUP_HASH||!code||Date.now()>Number(c.CKK_OWNER_SETUP_EXPIRES??0)||!constantTimeEqual(await sha256(code.trim()),c.CKK_OWNER_SETUP_HASH))throw new GameError(403,"Ce code d’activation n’est pas valide ou a expiré.");
 const db=database();
 const used=await db.prepare("SELECT claimed_by FROM admin_bootstrap WHERE key='owner'").first<{claimed_by:string}>();
 const existing=await db.prepare("SELECT id FROM auth_user WHERE email=?").bind(c.CKK_OWNER_EMAIL?.trim().toLowerCase()??"").first<{id:string}>();
 if(used){
  const owner=await db.prepare("SELECT id FROM profiles WHERE account_id=? AND role='owner'").bind(used.claimed_by).first();
  if(owner||used.claimed_by!==existing?.id)throw new GameError(409,"L’administration est déjà activée.");
 }
 // Resume an interrupted activation only after authenticating the same account.
 return !!existing;
}
async function guestProfile(request:Request){
 const token=readCookie(request,guestCookieName(request));
 if(!token||!/^[a-f0-9]{64}$/.test(token))return null;
 return database().prepare("SELECT p.id FROM profiles p JOIN guest_sessions s ON s.profile_id=p.id WHERE s.token_hash=? AND s.expires_at>? AND p.account_id IS NULL AND p.auth_subject IS NULL").bind(await sha256(token),Date.now()).first<{id:string}>();
}
export async function ensureGameProfile(user:{id:string;name:string},request:Request,promoteGuest=false){
 const db=database();const existing=await db.prepare("SELECT id FROM profiles WHERE account_id=?").bind(user.id).first();if(existing)return;
 const g=promoteGuest?await guestProfile(request):null;
 if(g){await db.batch([
  db.prepare("UPDATE profiles SET account_id=? WHERE id=? AND account_id IS NULL AND auth_subject IS NULL").bind(user.id,g.id),
  db.prepare("DELETE FROM guest_sessions WHERE profile_id=? AND EXISTS(SELECT 1 FROM profiles WHERE id=? AND account_id=?)").bind(g.id,g.id,user.id)
 ]);}
 await db.prepare("INSERT INTO profiles(id,account_id,name,avatar,created_at) SELECT ?,?,?,0,? WHERE NOT EXISTS(SELECT 1 FROM profiles WHERE account_id=?) ON CONFLICT(account_id) DO NOTHING").bind(crypto.randomUUID(),user.id,user.name,Date.now(),user.id).run();
}
async function claimOwner(user:{id:string;name:string},request:Request){
 const userId=user.id;
 const db=database();await db.batch([
  db.prepare("INSERT INTO admin_bootstrap(key,claimed_by,claimed_at) VALUES('owner',?,?) ON CONFLICT(key) DO NOTHING").bind(userId,Date.now()),
  db.prepare("UPDATE profiles SET account_id=? WHERE id=? AND account_id IS NULL AND NOT EXISTS(SELECT 1 FROM profiles WHERE account_id=?) AND EXISTS(SELECT 1 FROM admin_bootstrap WHERE key='owner' AND claimed_by=?)").bind(userId,authConfig().CKK_OWNER_LEGACY_PROFILE_ID??"",userId,userId),
 ]);
 await ensureGameProfile(user,request,false);
 await db.batch([
  db.prepare("UPDATE profiles SET role='owner' WHERE account_id=? AND EXISTS(SELECT 1 FROM admin_bootstrap WHERE key='owner' AND claimed_by=?)").bind(userId,userId),
 ]);
 const p=await db.prepare("SELECT role FROM profiles WHERE account_id=?").bind(userId).first<{role:string}>();if(p?.role!=="owner")throw new GameError(409,"L’administration est déjà activée.");
}
export async function requirePassword(request:Request,password:unknown){
 const user=await identity(request);if(!user)throw new GameError(401,"Reconnecte-toi pour continuer.");
 const row=await database().prepare("SELECT password FROM auth_account WHERE userId=? AND providerId='credential'").bind(user.id).first<{password:string}>();
 if(typeof password!=="string"||password.length>128||!row?.password||!await verifyPassword({password,hash:row.password}))throw new GameError(403,"Mot de passe incorrect.");return user;
}
export async function authRoute(request:Request,path:string):Promise<Response>{
 try{
  if(request.method!=="POST")return json({error:"Ressource introuvable."},404);
  guardRequest(request);const body=await limitedJson(request);const db=database();const ip=await sha256(request.headers.get("cf-connecting-ip")??"local");
  await limit(db,"auth-ip:"+ip,60,60000);
  if(["sign-up/email","sign-in/email","recover","activate-owner"].includes(path)){
   const normalized=typeof body.email==="string"?body.email.trim().toLowerCase():"";
   await limit(db,"auth-attempt:"+path+":"+ip+":"+await sha256(normalized),10,600000);
   // Never let unauthenticated traffic on other networks lock out a login.
   // Registration and recovery retain their own cross-network bounds.
   if(path!=="sign-in/email")await limit(db,"auth-email:"+path+":"+await sha256(normalized),40,3600000);
  }
  if(path==="recover"){
   const data=recovery.parse(body);const oldHash=await sha256(data.code.trim());
   const user=await db.prepare("SELECT u.id FROM auth_user u JOIN auth_recovery r ON r.user_id=u.id JOIN profiles p ON p.account_id=u.id WHERE u.email=? AND r.token_hash=? AND p.suspended_at IS NULL").bind(data.email,oldHash).first<{id:string}>();
   if(!user)throw new GameError(400,"E-mail ou code de récupération incorrect.");
   const password=await hashPassword(data.newPassword);const newCode=randomSecret();const now=Date.now();
   const result=await db.batch([
    db.prepare("UPDATE auth_account SET password=?,updatedAt=? WHERE userId=? AND providerId='credential' AND EXISTS(SELECT 1 FROM auth_recovery WHERE user_id=? AND token_hash=?)").bind(password,now,user.id,user.id,oldHash),
    db.prepare("DELETE FROM auth_session WHERE userId=? AND EXISTS(SELECT 1 FROM auth_recovery WHERE user_id=? AND token_hash=?)").bind(user.id,user.id,oldHash),
    db.prepare("UPDATE auth_recovery SET token_hash=?,created_at=? WHERE user_id=? AND token_hash=?").bind(await sha256(newCode),now,user.id,oldHash)
   ]);if(!result[0].meta.changes)throw new GameError(400,"Ce code a déjà été utilisé.");return json({ok:true,recoveryCode:newCode});
  }
  if(path==="rotate-recovery"){
   const user=await requirePassword(request,body.password);await limit(db,"recovery:"+user.id,5,600000);const code=randomSecret();
   await db.prepare("INSERT INTO auth_recovery(user_id,token_hash,created_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET token_hash=excluded.token_hash,created_at=excluded.created_at").bind(user.id,await sha256(code),Date.now()).run();return json({recoveryCode:code});
  }
  const creating=path==="sign-up/email"||path==="activate-owner";
  let data:any;let resumeActivation=false;
  if(creating){
   data=signup.parse(body);if(path==="activate-owner"){
    if(data.email!==authConfig().CKK_OWNER_EMAIL?.trim().toLowerCase())throw new GameError(403,"Utilise l’adresse du propriétaire du projet.");resumeActivation=await checkSetup(data.setupCode);
   }else if(data.email===authConfig().CKK_OWNER_EMAIL?.trim().toLowerCase()&&!await db.prepare("SELECT key FROM admin_bootstrap WHERE key='owner'").first())throw new GameError(403,"Cette adresse doit utiliser l’activation administrateur.");
   await limit(db,"signup-ip:"+ip,30,3600000);
  }else if(path==="sign-in/email")data=signin.parse(body);
  else if(path==="sign-out")data={};
  else if(path==="change-password")data=z.object({currentPassword:z.string().min(1).max(128),newPassword:passwordSchema}).strict().parse(body);
  else if(path==="revoke-other-sessions")data={};
  else return json({error:"Ressource introuvable."},404);
  const auth=authFor(request);const target=new URL(request.url);target.pathname="/api/auth/"+(resumeActivation?"sign-in/email":creating?"sign-up/email":path);target.search="";
  const payload=resumeActivation?{email:data.email,password:data.password}:creating?{name:data.name,email:data.email,password:data.password}:path==="change-password"?{...data,revokeOtherSessions:true}:data;
  const response=await auth.handler(new Request(target,{method:"POST",headers:request.headers,body:JSON.stringify(payload)}));
  const result:any=await response.json();if(!response.ok)return json({error:responseError(result.code)},response.status,response.headers);
  if(creating||path==="sign-in/email"){
   const user=result.user;if(!user?.id)throw new Error("Missing authenticated user");
   if(path==="activate-owner")await claimOwner(user,request);else await ensureGameProfile(user,request,creating);
   const profile=await db.prepare("SELECT suspended_at FROM profiles WHERE account_id=?").bind(user.id).first<{suspended_at:number|null}>();
   if(profile?.suspended_at){await db.prepare("DELETE FROM auth_session WHERE userId=?").bind(user.id).run();throw new GameError(403,"Ce compte est suspendu.");}
   let recoveryCode:string|undefined;
   if(creating){recoveryCode=randomSecret();await db.prepare("INSERT INTO auth_recovery(user_id,token_hash,created_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET token_hash=excluded.token_hash,created_at=excluded.created_at").bind(user.id,await sha256(recoveryCode),Date.now()).run();}
   // Session tokens and password hashes never appear in response bodies.
   return json({ok:true,...(recoveryCode?{recoveryCode}:{})},200,response.headers);
  }
  return json({ok:true},200,response.headers);
 }catch(error){
  if(error instanceof GameError)return json({error:error.message},error.status);
  if(error instanceof z.ZodError)return json({error:error.issues[0]?.message??"Vérifie les champs."},400);
  console.error("CKK auth failure",path,error instanceof Error?error.name:"Unknown");return json({error:"La connexion est momentanément indisponible. Réessaie."},503);
 }
}
