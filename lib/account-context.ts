import { identity } from "./auth";
import { database } from "./server-db";
import { GameError } from "./game-engine";
import { z } from "zod";
import { guardRequest,limitedJson,limit } from "./server-security";
export type AccountProfile={id:string;account_id:string;name:string;avatar:number;role:string;suspended_at:number|null};
export async function accountProfile(request:Request){
 const user=await identity(request);if(!user)throw new GameError(401,"Connecte-toi pour retrouver cet espace.");
 const profile=await database().prepare("SELECT * FROM profiles WHERE account_id=?").bind(user.id).first<AccountProfile>();
 if(!profile||profile.suspended_at)throw new GameError(403,"Ce profil n’est pas disponible.");return profile;
}
export function response(data:unknown,status=200){return Response.json(data,{status,headers:{"Cache-Control":"no-store, private","X-Content-Type-Options":"nosniff"}});}
export function failure(e:unknown){if(e instanceof GameError)return response({error:e.message},e.status);if(e instanceof z.ZodError)return response({error:e.issues[0]?.message??"Vérifie les champs."},400);console.error("CKK feature failure",e instanceof Error?e.name:"Unknown");return response({error:"Cette action est momentanément indisponible. Réessaie."},503);}
export async function accountRoute(request:Request,fn:(p:AccountProfile,body:Record<string,unknown>)=>Promise<unknown>){
 try{const p=await accountProfile(request);let body={};if(request.method!=="GET"){guardRequest(request);await limit(database(),"account-action:"+p.id,60);body=await limitedJson(request);}return response(await fn(p,body));}catch(e){return failure(e);}
}
/** A short lease serializes provider operations; stale owners cannot unlock a new lease. */
export async function withLock<T>(key:string,fn:()=>Promise<T>){
 const db=database(),token=crypto.randomUUID(),now=Date.now();const acquired=await db.prepare("INSERT INTO operation_locks(key,token,expires_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET token=excluded.token,expires_at=excluded.expires_at WHERE operation_locks.expires_at<? RETURNING token").bind(key,token,now+120000,now).first();
 if(!acquired)throw new GameError(409,"Une action est déjà en cours. Réessaie dans quelques instants.");
 try{return await fn();}finally{await db.prepare("DELETE FROM operation_locks WHERE key=? AND token=?").bind(key,token).run();}
}
