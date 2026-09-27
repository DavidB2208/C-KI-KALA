import { GameError } from "./game-engine";

// A namespace selector, never an authentication token. Proof of identity remains
// in the matching signed/opaque HttpOnly cookie, checked on every request.
export function sessionScope(request:Request){
 const value=request.headers.get("x-ckk-player");
 if(value===null)return "";
 if(!/^[a-f0-9]{32}$/.test(value))throw new GameError(400,"Cet onglet de jeu est invalide. Ouvre un nouveau joueur depuis la salle.");
 return value;
}
export function authCookiePrefix(request:Request){const scope=sessionScope(request);return scope?"ckk_p_"+scope:"ckk";}
export function guestCookieName(request:Request){const scope=sessionScope(request);return (new URL(request.url).protocol==="https:"?"__Host-":"")+"ckk_guest"+(scope?"_"+scope:"");}
export function readCookie(request:Request,name:string){return request.headers.get("cookie")?.split(";").map(s=>s.trim()).find(s=>s.startsWith(name+"="))?.slice(name.length+1);}
