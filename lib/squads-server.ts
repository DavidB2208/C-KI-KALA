import { z } from "zod";
import { database } from "./server-db";
import { GameError } from "./game-engine";
import { accountRoute,withLock,type AccountProfile } from "./account-context";
import { nameSchema,randomSecret,sha256,limit } from "./server-security";
type Row=Record<string,any>;
const description=z.string().trim().max(180).regex(/^[^<>\x00-\x1f]*$/u);
export async function squadMembership(squadId:string,profileId:string){return database().prepare("SELECT s.* FROM squads s JOIN squad_members m ON m.squad_id=s.id WHERE s.id=? AND m.profile_id=? AND m.state='active'").bind(squadId,profileId).first<Row>();}
// Sharing is unanimous and withdrawable. Leaving a Squad removes old consent too.
export const approvedSquadGames=`SELECT r.code,r.pack,r.mode,r.round_count,r.finished_at,r.set_name,r.deck_name FROM rooms r
 WHERE r.squad_id=? AND r.status='finished' AND r.expires_at>? AND json_array_length(r.roster)>=3
 AND NOT EXISTS(SELECT 1 FROM json_each(r.roster) j LEFT JOIN members m ON m.id=j.value
 LEFT JOIN squad_members sm ON sm.profile_id=m.profile_id AND sm.squad_id=r.squad_id
 WHERE m.id IS NULL OR m.squad_consent!=1 OR m.profile_id IS NULL OR sm.state IS NULL OR sm.state!='active')
 ORDER BY r.finished_at DESC,r.code LIMIT 100`;
export async function squadRoomInfo(room:Row,member:Row){
 if(!room.squad_id)return null;const db=database();const squad=await db.prepare("SELECT id,name FROM squads WHERE id=?").bind(room.squad_id).first<Row>();if(!squad)return null;
 const counts=await db.prepare(`SELECT COUNT(*) AS total,SUM(CASE WHEN m.squad_consent=1 AND sm.state='active' THEN 1 ELSE 0 END) AS accepted FROM json_each(?) j JOIN members m ON m.id=j.value LEFT JOIN squad_members sm ON sm.squad_id=? AND sm.profile_id=m.profile_id`).bind(room.roster,room.squad_id).first<Row>();
 const canConsent=!!(member.profile_id&&await squadMembership(room.squad_id,member.profile_id));
 return {...squad,canConsent,myConsent:!!member.squad_consent,accepted:counts?.accepted??0,total:counts?.total??0,published:room.status==='finished'&&(counts?.total??0)>=3&&counts!.total===counts!.accepted} as {id:string;name:string;canConsent:boolean;myConsent:boolean;accepted:number;total:number;published:boolean};
}
async function detail(id:string,p:AccountProfile){
 const db=database(),squad=await squadMembership(id,p.id);if(!squad)throw new GameError(404,"Squad introuvable ou accès retiré.");
 const members=(await db.prepare("SELECT p.id,p.name,p.avatar,m.joined_at FROM squad_members m JOIN profiles p ON p.id=m.profile_id WHERE m.squad_id=? AND m.state='active' ORDER BY m.joined_at,p.id").bind(id).all()).results;
 const games=(await db.prepare(approvedSquadGames).bind(id,Date.now()).all<Row>()).results;
 const scoreboard=(await db.prepare(`WITH games AS (${approvedSquadGames}) SELECT p.id,p.name,p.avatar,COUNT(DISTINCT g.code) AS games,
 SUM(CASE WHEN j.type='integer' AND j.value=5 THEN 1 ELSE 0 END) AS sCount,
 COUNT(CASE WHEN j.type='integer' AND j.value BETWEEN 0 AND 5 THEN 1 END) AS received,
 AVG(CASE WHEN j.type='integer' AND j.value BETWEEN 0 AND 5 THEN j.value END) AS average
 FROM games g JOIN members m ON m.room_code=g.code AND m.id IN (SELECT value FROM json_each((SELECT roster FROM rooms WHERE code=g.code)))
 JOIN profiles p ON p.id=m.profile_id LEFT JOIN rounds q ON q.room_code=g.code AND q.skipped=0
 LEFT JOIN ballots b ON b.room_code=q.room_code AND b.round=q.number AND b.abstained=0
 LEFT JOIN json_each(COALESCE(b.rankings,'{}')) j ON g.mode='players' AND j.key=m.id
 GROUP BY p.id ORDER BY games DESC,p.name,p.id`).bind(id,Date.now()).all()).results;
 const memories=(await db.prepare(`WITH games AS (${approvedSquadGames}) SELECT q.question,COUNT(DISTINCT g.code || ':' || q.number) AS rounds,COUNT(DISTINCT b.room_code || ':' || b.round || ':' || b.member_id) AS ballots
 FROM games g JOIN rounds q ON q.room_code=g.code AND q.skipped=0 AND q.question IS NOT NULL
 JOIN ballots b ON b.room_code=g.code AND b.round=q.number AND b.abstained=0
 GROUP BY q.question ORDER BY rounds DESC,ballots DESC,q.question LIMIT 12`).bind(id,Date.now()).all()).results;
 const banned=squad.owner_id===p.id?(await db.prepare("SELECT p.id,p.name FROM squad_members m JOIN profiles p ON p.id=m.profile_id WHERE m.squad_id=? AND m.state='blocked'").bind(id).all()).results:[];
 return {squad,members,games,scoreboard,memories,banned,scope:"100 dernières parties partagées, conservées au maximum un an"};
}
export async function squadsRoute(request:Request,path:string[]){return accountRoute(request,async(p,body)=>{
 const db=database(),method=request.method;
 if(!path.length){
  if(method==='GET')return {squads:(await db.prepare("SELECT s.*,(SELECT COUNT(*) FROM squad_members WHERE squad_id=s.id AND state='active') AS members FROM squads s JOIN squad_members m ON m.squad_id=s.id WHERE m.profile_id=? AND m.state='active' ORDER BY s.created_at DESC").bind(p.id).all()).results};
  if(method==='POST'){const data=z.object({name:nameSchema,description:description.default("")}).strict().parse(body);return withLock('squads-profile:'+p.id,async()=>{
   const count=await db.prepare("SELECT COUNT(*) AS n FROM squad_members WHERE profile_id=? AND state='active'").bind(p.id).first<Row>();if(count!.n>=10)throw new GameError(409,"Tu peux rejoindre jusqu’à 10 Squads.");const id=crypto.randomUUID();await db.batch([db.prepare("INSERT INTO squads(id,owner_id,name,description,created_at) VALUES(?,?,?,?,?)").bind(id,p.id,data.name,data.description,Date.now()),db.prepare("INSERT INTO squad_members(squad_id,profile_id,joined_at) VALUES(?,?,?)").bind(id,p.id,Date.now())]);return {id};
  });}
 }
 if(path[0]==='join'&&path.length===1&&method==='POST'){
  const token=z.string().regex(/^[a-f0-9]{64}$/).parse(body.token);await limit(db,'squad-invite:'+p.id,10);
  return withLock('squads-profile:'+p.id,async()=>{const invite=await db.prepare("SELECT squad_id FROM squad_invites WHERE token_hash=? AND expires_at>?").bind(await sha256(token),Date.now()).first<Row>();if(!invite)throw new GameError(404,"Invitation invalide, expirée ou révoquée.");
   return withLock('squad:'+invite.squad_id,async()=>{
    // Re-read under the group lock so rotation cannot race the join.
    const valid=await db.prepare("SELECT squad_id FROM squad_invites WHERE squad_id=? AND token_hash=? AND expires_at>?").bind(invite.squad_id,await sha256(token),Date.now()).first();if(!valid)throw new GameError(404,"Cette invitation a été révoquée.");
    const member=await db.prepare("SELECT state FROM squad_members WHERE squad_id=? AND profile_id=?").bind(invite.squad_id,p.id).first<Row>();if(member?.state==='blocked')throw new GameError(403,"L’administrateur de cette Squad doit autoriser ton retour.");if(member?.state==='active')return {id:invite.squad_id};
    const counts=await db.prepare("SELECT (SELECT COUNT(*) FROM squad_members WHERE squad_id=? AND state='active') AS people,(SELECT COUNT(*) FROM squad_members WHERE profile_id=? AND state='active') AS squads").bind(invite.squad_id,p.id).first<Row>();if(counts!.people>=30||counts!.squads>=10)throw new GameError(409,"Limite atteinte : 30 personnes par Squad et 10 Squads par compte.");
    await db.prepare("INSERT INTO squad_members(squad_id,profile_id,joined_at) VALUES(?,?,?) ON CONFLICT(squad_id,profile_id) DO UPDATE SET state='active',joined_at=excluded.joined_at").bind(invite.squad_id,p.id,Date.now()).run();return {id:invite.squad_id};
   });
  });
 }
 const id=z.string().uuid().parse(path[0]);
 if(path.length===1&&method==='GET')return detail(id,p);
 return withLock('squad:'+id,async()=>{
  const squad=await squadMembership(id,p.id);if(!squad)throw new GameError(404,"Squad introuvable.");const owner=()=>{if(squad.owner_id!==p.id)throw new GameError(403,"Cette action est réservée au propriétaire de la Squad.");};
  if(path.length===1&&method==='DELETE'){owner();await db.prepare("DELETE FROM squads WHERE id=? AND owner_id=?").bind(id,p.id).run();return {ok:true};}
  if(method!=='POST')throw new GameError(405,"Méthode non autorisée.");
  if(path.length===1){owner();const data=z.object({name:nameSchema,description:description.default("")}).strict().parse(body);await db.prepare("UPDATE squads SET name=?,description=? WHERE id=?").bind(data.name,data.description,id).run();return {ok:true};}
  if(path[1]==='invite'){owner();const token=randomSecret();await db.prepare("INSERT INTO squad_invites(squad_id,token_hash,expires_at) VALUES(?,?,?) ON CONFLICT(squad_id) DO UPDATE SET token_hash=excluded.token_hash,expires_at=excluded.expires_at").bind(id,await sha256(token),Date.now()+7*86400000).run();return {token,expiresInDays:7};}
  if(path[1]==='revoke-invite'){owner();await db.prepare("DELETE FROM squad_invites WHERE squad_id=?").bind(id).run();return {ok:true};}
  if(path[1]==='transfer'){owner();const target=z.string().uuid().parse(body.profileId);if(!await squadMembership(id,target))throw new GameError(404,"Choisis un membre actuel de la Squad.");await db.prepare("UPDATE squads SET owner_id=? WHERE id=? AND owner_id=?").bind(target,id,p.id).run();return {ok:true};}
  if(['leave','kick','restore'].includes(path[1])){
   const target=path[1]==='leave'?p.id:z.string().uuid().parse(body.profileId);if(path[1]!=='leave')owner();if(target===squad.owner_id)throw new GameError(409,"Transfère d’abord la Squad à un autre membre ou supprime-la.");
   const state=path[1]==='kick'?'blocked':'left';
   await db.batch([db.prepare("UPDATE squad_members SET state=? WHERE squad_id=? AND profile_id=?").bind(state,id,target),db.prepare("UPDATE members SET squad_consent=0 WHERE profile_id=? AND room_code IN (SELECT code FROM rooms WHERE squad_id=?)").bind(target,id)]);return {ok:true};
  }
  throw new GameError(404,"Action introuvable.");
 });
});}
