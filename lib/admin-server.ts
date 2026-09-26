import { billingConfig } from "./billing-server";
import { z } from "zod";
import { database } from "./server-db";
import { playerStats } from "./player-stats";
import { identity } from "./auth";
import { requirePassword } from "./auth-routes";
import { guardRequest,limitedJson,limit } from "./server-security";
import { PACKS } from "./game-data";
import { GameError } from "./game-engine";
type Row=Record<string,any>;
export async function adminRoute(request:Request,path:string[]):Promise<Response>{
 const db=database();const first=(sql:string,...values:any[])=>db.prepare(sql).bind(...values).first<Row>();
 const rows=async(sql:string,...values:any[])=>(await db.prepare(sql).bind(...values).all<Row>()).results;
 const audit=(actor:string,action:string,target:string)=>db.prepare("INSERT INTO admin_audit(id,actor_id,action,target_id,created_at) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(),actor,action,target,Date.now()).run();
 const respond=(value:unknown,status=200)=>Response.json(value,{status,headers:{"Cache-Control":"no-store, private","X-Content-Type-Options":"nosniff"}});
 try{
  const user=await identity(request);if(!user)throw new GameError(401,"Connecte-toi à ton compte administrateur.");
  const actor=await first("SELECT id,role,suspended_at FROM profiles WHERE account_id=?",user.id);
  if(actor?.role!=="owner"||actor.suspended_at)throw new GameError(403,"Cet espace est réservé à l’administrateur.");
  await limit(db,"admin:"+user.id,60);
  const url=new URL(request.url);const offset=z.coerce.number().int().min(0).max(100000).parse(url.searchParams.get("offset")??0);
  if(request.method==="POST"){
   guardRequest(request);const body=await limitedJson(request);await requirePassword(request,body.password);
   if(path[0]==="users"&&path[2]==="status"){
    const target=await first("SELECT id,account_id,role FROM profiles WHERE id=?",path[1]);if(!target)throw new GameError(404,"Profil introuvable.");
    if(target.role==="owner"||target.id===actor.id)throw new GameError(403,"Le compte propriétaire ne peut pas être suspendu.");
    const suspended=z.boolean().parse(body.suspended);
    await db.batch([
     db.prepare("UPDATE profiles SET suspended_at=? WHERE id=? AND role!='owner'").bind(suspended?Date.now():null,target.id),
     db.prepare("DELETE FROM auth_session WHERE userId=?").bind(target.account_id??""),
     db.prepare("DELETE FROM guest_sessions WHERE profile_id=?").bind(target.id),
    ]);await audit(actor.id,suspended?"suspend-user":"restore-user",target.id);return respond({ok:true});
   }
   throw new GameError(404,"Action introuvable.");
  }
  if(request.method!=="GET")throw new GameError(405,"Méthode non autorisée.");
  if(path.length===0||path[0]==="overview"){
   const counts=await first("SELECT (SELECT COUNT(*) FROM auth_user) AS accounts,(SELECT COUNT(*) FROM profiles WHERE account_id IS NULL) AS guests,(SELECT COUNT(*) FROM rooms) AS games,(SELECT COUNT(*) FROM rooms WHERE status IN ('lobby','choosing','voting','reveal') AND created_at>?) AS activeGames,(SELECT COUNT(*) FROM ballots) AS votes,(SELECT COUNT(*) FROM question_reports) AS reports",Date.now()-86400000);
   const product=await first(`SELECT COUNT(*) AS finishedGames,COUNT(x.target_code) AS rematchLobbies,
    SUM(CASE WHEN next.current_round>0 THEN 1 ELSE 0 END) AS rematchesStarted
    FROM rooms r LEFT JOIN rematches x ON x.source_code=r.code LEFT JOIN rooms next ON next.code=x.target_code
    WHERE r.status='finished' AND r.finished_at>=? AND r.expires_at>?`,Date.now()-30*86400000,Date.now());
   const bc=billingConfig();const commerce={ready:bc.ready&&bc.checkoutOpen,mode:bc.mode,...await first("SELECT (SELECT COUNT(*) FROM squads) AS squads,(SELECT COUNT(*) FROM question_decks) AS decks,(SELECT COUNT(*) FROM billing_orders WHERE status='paid' AND mode=?) AS paidOrders",bc.mode)};
   return respond({counts,product,commerce,audit:await rows("SELECT a.action,a.target_id,a.created_at,p.name AS actor FROM admin_audit a LEFT JOIN profiles p ON p.id=a.actor_id ORDER BY a.created_at DESC LIMIT 20")});
  }
  if(path[0]==="users"&&path.length===1){
   const search=(url.searchParams.get("search")??"").trim().slice(0,80);const escaped=search.replace(/[\\%_]/g,"\\$&");const q="%"+escaped+"%";
   const users=await rows("SELECT p.id,p.name,p.avatar,p.role,p.created_at,p.suspended_at,p.account_id IS NOT NULL AS is_account,u.email,u.emailVerified AS email_verified,(SELECT COUNT(*) FROM members m WHERE m.profile_id=p.id) AS games FROM profiles p LEFT JOIN auth_user u ON u.id=p.account_id WHERE (p.name LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\') ORDER BY p.created_at DESC,p.id LIMIT 26 OFFSET ?",q,q,offset);
   return respond({users:users.slice(0,25),hasMore:users.length>25,offset});
  }
  if(path[0]==="users"&&path.length===2){
   const target=await first("SELECT p.id,p.name,p.avatar,p.role,p.created_at,p.suspended_at,p.account_id IS NOT NULL AS is_account,u.email,u.emailVerified AS email_verified FROM profiles p LEFT JOIN auth_user u ON u.id=p.account_id WHERE p.id=?",path[1]);if(!target)throw new GameError(404,"Profil introuvable.");
   await audit(actor.id,"view-user",target.id);
   const games=await rows("SELECT r.code,r.status,r.pack,r.set_name,r.mode,r.created_at,r.finished_at,r.round_count,m.name AS participant FROM members m JOIN rooms r ON r.code=m.room_code WHERE m.profile_id=? ORDER BY r.created_at DESC LIMIT 26 OFFSET ?",target.id,offset);
   const sets=await rows("SELECT id,name,items,updated_at FROM saved_sets WHERE owner_id=? ORDER BY updated_at DESC",target.id);
   const summary=await playerStats(db,target.id);
   const stats={completedGames:summary.games,submittedVotes:summary.roundVotes,scope:summary.scope};
   return respond({user:target,games:games.slice(0,25),hasMore:games.length>25,sets:sets.map(s=>({...s,items:JSON.parse(s.items)})),stats});
  }
  if(path[0]==="rooms"&&path.length===1){
   const games=await rows("SELECT r.code,r.status,r.pack,r.mode,r.set_name,r.current_round,r.round_count,r.created_at,r.finished_at,p.name AS host,(SELECT COUNT(*) FROM members m WHERE m.room_code=r.code) AS players FROM rooms r LEFT JOIN profiles p ON p.id=r.host_id ORDER BY r.created_at DESC LIMIT 26 OFFSET ?",offset);
   return respond({games:games.slice(0,25),hasMore:games.length>25});
  }
  if(path[0]==="rooms"&&path.length===2){
   const room=await first("SELECT code,status,pack,mode,set_name,created_at,finished_at,targets FROM rooms WHERE code=?",path[1]);if(!room)throw new GameError(404,"Salle introuvable.");
   await audit(actor.id,"view-room",room.code);
   const members=await rows("SELECT id,name,avatar,state FROM members WHERE room_code=?",room.code);
   const rounds=await rows("SELECT number,question,skipped FROM rounds WHERE room_code=? ORDER BY number",room.code);
   const ballots=["finished","closed"].includes(room.status)?await rows("SELECT b.round,b.rankings,b.abstained,m.name FROM ballots b JOIN members m ON m.id=b.member_id WHERE b.room_code=? ORDER BY b.round,m.name",room.code):[];
   return respond({room:{...room,targets:JSON.parse(room.targets)},members,rounds,ballots:ballots.map(b=>({...b,rankings:JSON.parse(b.rankings)}))});
  }
  if(path[0]==="feedback"){
   const feedback=await rows(`SELECT r.pack,q.question,COUNT(*) AS total,
    SUM(CASE WHEN f.rating=1 THEN 1 ELSE 0 END) AS likes,
    SUM(CASE WHEN f.rating=-1 THEN 1 ELSE 0 END) AS dislikes,
    COUNT(DISTINCT f.room_code) AS rooms
    FROM question_feedback f JOIN rooms r ON r.code=f.room_code
    JOIN rounds q ON q.room_code=f.room_code AND q.number=f.round
    JOIN members m ON m.id=f.member_id
    WHERE r.theme_mode='pack' AND r.expires_at>? AND q.skipped=0 AND m.state!='kicked'
    AND m.id IN (SELECT value FROM json_each(r.roster))
    GROUP BY r.pack,q.question ORDER BY total DESC,r.pack,q.question`,Date.now());
   const catalogue=feedback.filter(f=>PACKS.some(p=>p.id===f.pack&&(p.questions as readonly string[]).includes(f.question)));
   return respond({feedback:catalogue.slice(offset,offset+25),hasMore:catalogue.length>offset+25});
  }
  if(path[0]==="reports"){
   const reports=await rows("SELECT q.id,q.room_code,q.round,q.reason,q.created_at,r.question,m.name FROM question_reports q LEFT JOIN rounds r ON r.room_code=q.room_code AND r.number=q.round LEFT JOIN members m ON m.id=q.member_id ORDER BY q.created_at DESC LIMIT 26 OFFSET ?",offset);
   return respond({reports:reports.slice(0,25),hasMore:reports.length>25});
  }
  throw new GameError(404,"Ressource introuvable.");
 }catch(error){
  if(error instanceof GameError)return respond({error:error.message},error.status);
  if(error instanceof z.ZodError)return respond({error:"Paramètres invalides."},400);
  console.error("CKK admin failure",error instanceof Error?error.name:"Unknown");return respond({error:"Le tableau de gestion est momentanément indisponible."},503);
 }
}
