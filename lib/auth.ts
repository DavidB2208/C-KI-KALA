import { betterAuth } from "better-auth";
import { env } from "cloudflare:workers";
import { database } from "./server-db";
import { GameError } from "./game-engine";

export function authConfig(){return env as Cloudflare.Env;}
let cached:{db:D1Database;origin:string;secret:string;auth:ReturnType<typeof buildAuth>}|undefined;
export function authFor(request:Request){
 const config=authConfig();const requestOrigin=new URL(request.url).origin;
 const local=["http://localhost","http://terminal.local:4173"].includes(requestOrigin);
 const origin=config.CKK_APP_ORIGIN??(local?requestOrigin:undefined);
 if(!config.BETTER_AUTH_SECRET||!origin)throw new GameError(503,"La connexion est momentanément indisponible.");
 const db=database();
 if(cached?.db===db&&cached.origin===origin&&cached.secret===config.BETTER_AUTH_SECRET)return cached.auth;
 const auth=buildAuth(db,origin,config.BETTER_AUTH_SECRET);
 cached={db,origin,secret:config.BETTER_AUTH_SECRET,auth};return auth;
}
function buildAuth(db:D1Database,origin:string,secret:string){
 return betterAuth({
  appName:"C KI KA LA",baseURL:origin,basePath:"/api/auth",secret,
  database:db,trustedOrigins:[origin],
  user:{modelName:"auth_user"},account:{modelName:"auth_account",accountLinking:{enabled:false}},verification:{modelName:"auth_verification"},
  emailAndPassword:{enabled:true,minPasswordLength:12,maxPasswordLength:128,autoSignIn:true,revokeSessionsOnPasswordReset:true},
  session:{modelName:"auth_session",expiresIn:60*60*24*7,updateAge:60*60*24,freshAge:60*15,cookieCache:{enabled:false}},
  advanced:{cookiePrefix:"ckk",useSecureCookies:origin.startsWith("https:"),defaultCookieAttributes:{httpOnly:true,sameSite:"lax",path:"/"},ipAddress:{disableIpTracking:true},database:{generateId:()=>crypto.randomUUID()}},
  // All exposed operations have atomic D1 rate limits in the wrapper.
  rateLimit:{enabled:false},
  databaseHooks:{session:{create:{before:async(session)=>{
   const p=await database().prepare("SELECT suspended_at FROM profiles WHERE account_id=?").bind(session.userId).first<{suspended_at:number|null}>();
   if(p?.suspended_at)return false;
  }}}},
 });
}
export async function identity(request:Request){
 if(!request.headers.get("cookie")?.includes("ckk.session_token="))return null;
 const session=await authFor(request).api.getSession({headers:request.headers,query:{disableCookieCache:true,disableRefresh:true}});
 return session?.user??null;
}
