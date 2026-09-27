"use client";
import { useState,useEffect,useId,type CSSProperties } from "react";
import { ArrowLeft,ArrowRight,Download,BookmarkPlus,Share2,Copy } from "lucide-react";
import { toast } from "sonner";
import { TIERS,type Result,type RoomState } from "@/lib/game-data";
import { api,errorMessage } from "@/lib/client";
import { Avatar,ErrorNote } from "./common";
import { resultImage } from "@/lib/result-image";
import { Dialog,DialogContent,DialogTitle,DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

export function DownloadResults({results,title,subtitle,label="Partager / télécharger"}:{results:Result[];title:string;subtitle:string;label?:string}){
 const [open,setOpen]=useState(false),[story,setStory]=useState(label!=="Enregistrer la tier-list"),[names,setNames]=useState(false);
 const [asset,setAsset]=useState<{blob:Blob;url:string}|null>(null),[error,setError]=useState(""),[sharing,setSharing]=useState(false),[copyFallback,setCopyFallback]=useState("");
 const checkId=useId();const resultKey=JSON.stringify(results);
 useEffect(()=>{
  if(!open)return;let cancelled=false;let url:string|undefined;setAsset(null);setError("");
  resultImage({results:JSON.parse(resultKey) as Result[],title,subtitle,story,names,origin:window.location.origin}).then(blob=>{if(cancelled)return;url=URL.createObjectURL(blob);setAsset({blob,url});}).catch(()=>{if(!cancelled)setError("L’image n’a pas pu être créée. Ferme puis rouvre cet aperçu pour réessayer.");});
  return()=>{cancelled=true;if(url)URL.revokeObjectURL(url);};
 },[open,story,names,resultKey,title,subtitle]);
 function download(){if(!asset)return;const link=document.createElement("a");link.href=asset.url;link.download=story?"c-ki-ka-la-story.png":"c-ki-ka-la-tier-list.png";link.click();toast.success("Image téléchargée. Tu peux l’ajouter à ta Story ou l’envoyer à tes amis.");}
 async function share(){if(!asset)return;setSharing(true);setError("");try{
  const file=new File([asset.blob],"c-ki-ka-la-resultat.png",{type:"image/png"});
  if(navigator.canShare?.({files:[file]})&&navigator.share)await navigator.share({files:[file]});
  else{download();toast("Partage de fichiers indisponible ici : utilise l’image téléchargée.");}
 }catch(e){if(!(e instanceof Error&&e.name==="AbortError"))setError("Le partage a échoué. Tu peux télécharger l’image puis l’envoyer.");}finally{setSharing(false);}}
 return <><button className="button secondary" disabled={!results.length} onClick={()=>{setNames(false);setAsset(null);setCopyFallback("");setOpen(true);}}><Download size={17}/>{label}</button>
 <Dialog open={open} onOpenChange={setOpen}><DialogContent className="game-dialog share-dialog"><DialogTitle className="dialog-title">Le souvenir de la soirée.</DialogTitle><DialogDescription>Vérifie l’aperçu avant de le partager. Demande l’accord de tes amis pour les pseudos et les questions personnelles.</DialogDescription>
 <label className="field mt">Format<select value={story?"story":"board"} onChange={e=>setStory(e.target.value==="story")}><option value="story">Story · 1080 × 1920</option><option value="board">Tier-list complète</option></select></label>
 <div className="share-name-choice"><Checkbox id={checkId} checked={names} onCheckedChange={v=>setNames(v===true)}/><label htmlFor={checkId}>Inclure les pseudos / noms des éléments</label></div>
 <div className="share-preview" aria-busy={!asset&&!error}>{asset?<img src={asset.url} alt="Aperçu exact de l’image à partager"/>:<p role="status">{error?"Aperçu indisponible":"Préparation de l’aperçu…"}</p>}</div><ErrorNote error={error}/>
 <div className="row result-actions"><button className="button primary" disabled={!asset||sharing} onClick={()=>void share()}><Share2 size={17}/>Partager l’image</button><button className="button secondary" disabled={!asset} onClick={download}><Download size={17}/>Télécharger PNG</button></div>
 <button className="textlink mt" onClick={async()=>{const url=window.location.origin+"/";try{await navigator.clipboard.writeText(url);toast.success("Lien du jeu copié. Aucun résultat privé n’est publié.");}catch{setCopyFallback(url);}}}><Copy size={16}/>Copier le lien du jeu</button>{copyFallback&&<input className="share-link" aria-label="Lien du jeu à copier" readOnly value={copyFallback} onFocus={e=>e.target.select()}/>}
 <p className="help-note mt">L’image est créée sur ton appareil. Aucune page publique de résultats n’est créée. Les applications proposées dépendent de ton navigateur.</p>
 </DialogContent></Dialog></>;
}

export function BallotGallery({room}:{room:RoomState}){
 const [index,setIndex]=useState(0),[roundIndex,setRoundIndex]=useState(0);
 const rounds=room.status==="finished"?room.ballotRounds:[{number:room.currentRound,question:room.question,ballots:room.revealedBallots}];
 const selected=rounds[Math.min(roundIndex,rounds.length-1)];if(!selected?.ballots.length)return null;
 const ballots=selected.ballots,current=Math.min(index,ballots.length-1),ballot=ballots[current];
 const unranked=room.targets.filter(t=>Object.prototype.hasOwnProperty.call(ballot.rankings,t.id)&&ballot.rankings[t.id]===null);
 return <section id={"ballots-"+room.code} className="panel mt ballot-gallery" aria-label="Classements individuels"><div className="section-head"><div><h2>Qui a classé qui ?</h2><p className="help-note">Manche {selected.number} · {selected.question??"les votes sont révélés"}</p></div>{rounds.length>1&&<label className="ballot-round-picker">Manche<select aria-label="Manche à consulter" value={selected.number} onChange={e=>{setRoundIndex(rounds.findIndex(r=>r.number===Number(e.target.value)));setIndex(0);}}>{rounds.map(r=><option key={r.number} value={r.number}>Manche {r.number}</option>)}</select></label>}</div>
  <div className="ballot-nav"><button className="button secondary small" aria-label="Classement précédent" disabled={current===0} onClick={()=>setIndex(current-1)}><ArrowLeft size={18}/></button><div className="row" aria-live="polite"><Avatar {...ballot}/><span><b>{ballot.name}</b><small className="help-note block">{current+1} / {ballots.length}</small></span></div><button className="button secondary small" aria-label="Classement suivant" disabled={current===ballots.length-1} onClick={()=>setIndex(current+1)}><ArrowRight size={18}/></button></div>
  {ballot.abstained?<p className="notice">Ce joueur a passé son vote.</p>:<><div className="tier-board compact-board">{TIERS.map(t=><div className="tier-row" key={t.key} style={{"--tier":t.color} as CSSProperties}><div className="tier-label"><strong>{t.key}</strong></div><div className="tier-content">{room.targets.filter(p=>ballot.rankings[p.id]===t.value).map(p=><div className="player-chip" key={p.id}><Avatar {...p}/><span className="chip-name">{p.name}</span></div>)}</div></div>)}</div>{unranked.length>0&&<p className="help-note mt">Non classés : {unranked.map(t=>t.name).join(" · ")}. Aucun point attribué.</p>}</>}
 </section>;
}

export function SaveRoomSet({room}:{room:RoomState}){
 const [busy,setBusy]=useState(false);const [saved,setSaved]=useState(false);if(room.mode!=="set")return null;
 return <button className="button secondary" disabled={busy||saved} onClick={async()=>{setBusy(true);try{await api("sets","POST",{name:room.setName,items:room.targets.map(t=>t.name)});setSaved(true);toast.success("Set ajouté à tes sets enregistrés.");}catch(e){toast.error(errorMessage(e));}finally{setBusy(false);}}}><BookmarkPlus size={17}/>{saved?"Set enregistré":busy?"Enregistrement…":"Garder ce set"}</button>;
}
