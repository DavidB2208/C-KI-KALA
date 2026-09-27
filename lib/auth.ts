import { betterAuth } from "better-auth";
import { env } from "cloudflare:workers";
import { database } from "./server-db";
import { GameError } from "./game-engine";
import { authOrigin } from "./auth-origin";
import { authCookiePrefix,readCookie } from "./session-scope";

export function authConfig(){return env as Cloudflare.Env;}
let cached:{db:D1Database;origin:string;secret:string;prefix:string;auth:ReturnType<typeof buildAuth>}|undefined;
export function authFor(request:Request){
 const config=authConfig();const origin=authOrigin(request,config.CKK_APP_ORIGIN);const prefix=authCookiePrefix(request);
 if(!config.BETTER_AUTH_SECRET||config.BETTER_AUTH_SECRET.length<32)throw new GameError(503,"Les comptes ne sont pas configurés côté serveur. En local, lance pnpm setup:local puis redémarre le jeu.");
 const db=database();
 if(cached?.db===db&&cached.origin===origin&&cached.secret===config.BETTER_AUTH_SECRET&&cached.prefix===prefix)return cached.auth;
 const auth=buildAuth(db,origin,config.BETTER_AUTH_SECRET,prefix);
 cached={db,origin,secret:config.BETTER_AUTH_SECRET,prefix,auth};return auth;
}
function buildAuth(db:D1Database,origin:string,secret:string,prefix:string){
 return betterAuth({
  appName:"C KI KA LA",baseURL:origin,basePath:"/api/auth",secret,
  database:db,trustedOrigins:[origin],
  user:{modelName:"auth_user"},account:{modelName:"auth_account",accountLinking:{enabled:false}},verification:{modelName:"auth_verification"},
  emailAndPassword:{enabled:true,minPasswordLength:12,maxPasswordLength:128,autoSignIn:true,revokeSessionsOnPasswordReset:true},
  session:{modelName:"auth_session",expiresIn:60*60*24*7,updateAge:60*60*24,freshAge:60*15,cookieCache:{enabled:false}},
  advanced:{cookiePrefix:prefix,useSecureCookies:origin.startsWith("https:"),defaultCookieAttributes:{httpOnly:true,sameSite:"lax",path:"/"},ipAddress:{disableIpTracking:true},database:{generateId:()=>crypto.randomUUID()}},
  // All exposed operations have atomic D1 rate limits in the wrapper.
  rateLimit:{enabled:false},
  databaseHooks:{session:{create:{before:async(session)=>{
   const p=await database().prepare("SELECT suspended_at FROM profiles WHERE account_id=?").bind(session.userId).first<{suspended_at:number|null}>();
   if(p?.suspended_at)return false;
  }}}},
 });
}
export async function identity(request:Request){
 const prefix=authCookiePrefix(request);
 if(!readCookie(request,prefix+".session_token")&&!readCookie(request,"__Secure-"+prefix+".session_token"))return null;
 const session=await authFor(request).api.getSession({headers:request.headers,query:{disableCookieCache:true,disableRefresh:true}});
 return session?.user??null;
}
