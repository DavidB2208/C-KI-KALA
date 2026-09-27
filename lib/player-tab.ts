const storageKey="ckk.player-tab.v1";

export function playerTabScope(){
 if(typeof window==="undefined")return "";
 const url=new URL(window.location.href);
 if(url.searchParams.get("newPlayer")==="1"){
  // Explicit links always create a fresh namespace, even when the browser
  // copies sessionStorage from the opening tab.
  const scope=Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,"0")).join("");
  try{sessionStorage.setItem(storageKey,scope);}catch{throw new Error("Le stockage de cet onglet est bloqué. Utilise un autre profil de navigateur pour jouer séparément.");}
  url.searchParams.delete("newPlayer");window.history.replaceState(window.history.state,"",url.pathname+url.search+url.hash);
 }
 let scope:string|null;
 try{scope=sessionStorage.getItem(storageKey);}catch{return "";}
 if(scope&&!/^[a-f0-9]{32}$/.test(scope))throw new Error("Cet onglet de jeu est invalide. Ouvre un nouveau joueur depuis la salle.");
 return scope??"";
}
export function returnToMainPlayer(){
 try{sessionStorage.removeItem(storageKey);}catch{throw new Error("Le stockage de cet onglet est bloqué.");}
 window.location.assign("/");
}
