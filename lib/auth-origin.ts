import { GameError } from "./game-engine";

function loopback(url:URL){return ["localhost","127.0.0.1","[::1]"].includes(url.hostname)&&["http:","https:"].includes(url.protocol);}
export function authOrigin(request:Request,configured?:string){
 const url=new URL(request.url);
 if(configured){
  let base:URL;try{base=new URL(configured);}catch{throw new GameError(503,"L’adresse du jeu est mal configurée. Vérifie CKK_APP_ORIGIN côté serveur.");}
  if(base.origin!==configured||!["http:","https:"].includes(base.protocol))throw new GameError(503,"CKK_APP_ORIGIN doit contenir l’origine exacte du jeu, sans chemin ni barre finale.");
  // Only a development configuration may adapt to another loopback port/host.
  // A production origin never trusts an arbitrary Host or forwarded header.
  return loopback(base)&&loopback(url)?url.origin:base.origin;
 }
 if(loopback(url)||url.origin==="http://terminal.local:4173")return url.origin;
 throw new GameError(503,"L’adresse du jeu n’est pas configurée côté serveur.");
}
