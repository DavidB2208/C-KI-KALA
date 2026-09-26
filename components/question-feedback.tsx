"use client";
import { useState } from "react";
import { ThumbsUp,ThumbsDown } from "lucide-react";
import { api,errorMessage } from "@/lib/client";
import { ErrorNote } from "./common";
export function QuestionFeedback({code,round,initial}:{code:string;round:number;initial:1|-1|null}){
 const [rating,setRating]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function rate(value:1|-1){setBusy(true);setError("");try{const next=rating===value?null:value;await api(`rooms/${code}/feedback`,"POST",{round,rating:next});setRating(next);}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}
 return <section className="panel mt question-feedback"><div><h2>Cette question vous a fait débattre ?</h2><p className="help-note">Note la question, pas les joueurs. Tu peux changer ou retirer ton avis.</p></div><div className="row mt"><button className={"button secondary"+(rating===1?" selected":"")} aria-pressed={rating===1} disabled={busy} onClick={()=>void rate(1)}><ThumbsUp size={18}/>À garder</button><button className={"button secondary"+(rating===-1?" selected":"")} aria-pressed={rating===-1} disabled={busy} onClick={()=>void rate(-1)}><ThumbsDown size={18}/>À revoir</button></div><p className="help-note mt" role="status">{rating===null?"Avis facultatif, séparé des signalements.":"Avis enregistré. Il n’est pas affiché aux autres joueurs."}</p><ErrorNote error={error}/></section>;
}
