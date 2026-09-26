import { z } from "zod";
import { database } from "./server-db";
import { accountRoute,withLock } from "./account-context";
import { nameSchema } from "./server-security";
import { GameError } from "./game-engine";
export const questionText=z.string().trim().min(6).max(160).regex(/^[^<>\x00-\x1f\x7f]+$/u);
const questions=z.array(questionText).min(1).max(50).refine(a=>new Set(a.map(q=>q.toLocaleLowerCase('fr'))).size===a.length,"Évite les questions identiques dans le même deck.");
export async function decksRoute(request:Request,path:string[]){return accountRoute(request,async(p,body)=>{
 const db=database();
 if(!path.length&&request.method==='GET')return {decks:(await db.prepare("SELECT id,name,questions,updated_at FROM question_decks WHERE owner_id=? ORDER BY updated_at DESC").bind(p.id).all<Record<string,any>>()).results.map(d=>({...d,questions:JSON.parse(d.questions)}))};
 if(!path.length&&request.method==='POST'){
  const data=z.object({id:z.string().uuid().optional(),name:nameSchema,questions}).strict().parse(body);
  return withLock('decks:'+p.id,async()=>{if(data.id){const r=await db.prepare("UPDATE question_decks SET name=?,questions=?,updated_at=? WHERE id=? AND owner_id=?").bind(data.name,JSON.stringify(data.questions),Date.now(),data.id,p.id).run();if(!r.meta.changes)throw new GameError(404,"Deck introuvable.");return {id:data.id};}
   const count=await db.prepare("SELECT COUNT(*) AS n FROM question_decks WHERE owner_id=?").bind(p.id).first<{n:number}>();if(count!.n>=20)throw new GameError(409,"Tu peux enregistrer jusqu’à 20 decks privés.");const id=crypto.randomUUID();await db.prepare("INSERT INTO question_decks(id,owner_id,name,questions,updated_at) VALUES(?,?,?,?,?)").bind(id,p.id,data.name,JSON.stringify(data.questions),Date.now()).run();return {id};
  });
 }
 if(path.length===1&&request.method==='DELETE'){const id=z.string().uuid().parse(path[0]);await db.prepare("DELETE FROM question_decks WHERE id=? AND owner_id=?").bind(id,p.id).run();return {ok:true};}
 throw new GameError(404,"Ressource introuvable.");
});}
