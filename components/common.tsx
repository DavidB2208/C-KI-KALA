"use client";
import { type CSSProperties } from "react";
import { LoaderCircle } from "lucide-react";
import { AVATARS } from "@/lib/game-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog,AlertDialogTrigger,AlertDialogContent,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction } from "@/components/ui/alert-dialog";
export function Avatar({name,avatar=0,size=""}:{name:string;avatar?:number;size?:string}){return <span className={"avatar "+size} style={{"--avatar":AVATARS[avatar%AVATARS.length]} as CSSProperties}>{name.trim().slice(0,2).toUpperCase()}</span>;}
export function Loading(){return <div className="loading" role="status"><LoaderCircle className="spinner" size={28} style={{margin:"0 auto 15px"}}/>La salle se prépare…</div>;}
export function ErrorNote({error}:{error:string}){return error?<p className="inline-error" role="alert">{error}</p>:null;}
export function Pick({label,value,onChange,options}:{label:string;value:string;onChange:(s:string)=>void;options:{value:string;label:string}[]}){return <div className="field"><span>{label}</span><Select value={value} onValueChange={onChange}><SelectTrigger className="form-select" aria-label={label}><SelectValue/></SelectTrigger><SelectContent>{options.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>;}
export function Confirm({children,title,description,onConfirm}:{children:React.ReactNode;title:string;description:string;onConfirm:()=>void}){return <AlertDialog><AlertDialogTrigger asChild>{children}</AlertDialogTrigger><AlertDialogContent className="game-dialog"><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription><AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={onConfirm}>Confirmer</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;}
