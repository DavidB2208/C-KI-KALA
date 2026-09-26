import { z } from "zod";
import { GameError } from "./game-engine";
export const nameSchema=z.string().trim().min(2,"Le pseudo doit contenir au moins 2 caractères.").max(24,"Maximum 24 caractères.").regex(/^[\p{L}\p{N} ._'’!?-]+$/u,"Utilise des lettres, chiffres, espaces ou tirets.");
export const emailSchema=z.string().trim().toLowerCase().email("Adresse e-mail invalide.").max(254);
export const passwordSchema=z.string().min(12,"Choisis au moins 12 caractères.").max(128,"Maximum 128 caractères.");
export async function sha256(value:string){const raw=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return Array.from(new Uint8Array(raw),b=>b.toString(16).padStart(2,"0")).join("");}
export const randomSecret=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,"0")).join("");
export function guardRequest(request:Request){
 if(request.headers.get("origin")!==new URL(request.url).origin)throw new GameError(403,"Cette action doit être effectuée depuis le jeu.");
 const site=request.headers.get("sec-fetch-site");if(site&&site!=="same-origin"&&site!=="none")throw new GameError(403,"Origine non autorisée.");
 if(request.headers.get("x-ckk-request")!=="1")throw new GameError(403,"Rouvre la page pour continuer.");
}
export async function limitedJson(request:Request){
 if(!request.headers.get("content-type")?.startsWith("application/json"))throw new GameError(415,"Une requête JSON est nécessaire.");
 const reader=request.body?.getReader();if(!reader)return {};const parts:Uint8Array[]=[];let size=0;
 while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>16384){await reader.cancel();throw new GameError(413,"La demande est trop volumineuse.");}parts.push(part.value);}
 const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
 let parsed:unknown;try{parsed=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new GameError(400,"La demande est illisible.");}
 if(parsed===null||typeof parsed!=="object"||Array.isArray(parsed))throw new GameError(400,"La demande doit contenir un objet JSON.");
 return parsed as Record<string,unknown>;
}
export async function limit(db:D1Database,key:string,max:number,window=60000){
 const now=Date.now();const row=await db.prepare("INSERT INTO rate_limits(key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END,expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END RETURNING count").bind(key,now+window,now,now).first<{count:number}>();
 if(row&&row.count>max)throw new GameError(429,"Trop de tentatives. Réessaie un peu plus tard.");
}
