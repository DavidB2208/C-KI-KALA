/** One bounded aggregate query, shared by the player and owner dashboards. */
export async function playerStats(db:D1Database,profileId:string){
 const history=(await db.prepare(`
  WITH games AS (
   SELECT r.code,r.pack,r.set_name,r.mode,r.round_count,r.finished_at,m.id AS member_id,
    (SELECT question FROM rounds q WHERE q.room_code=r.code AND q.skipped=0 AND q.question IS NOT NULL ORDER BY q.number LIMIT 1) AS title
   FROM rooms r JOIN members m ON m.room_code=r.code
   WHERE m.profile_id=? AND r.status='finished' AND m.state!='kicked'
    AND m.id IN (SELECT value FROM json_each(r.roster)) AND r.expires_at>?
   ORDER BY r.finished_at DESC,r.code LIMIT 100
  )
  SELECT g.*,
   SUM(CASE WHEN b.member_id=g.member_id THEN 1 ELSE 0 END) AS roundVotes,
   AVG(CASE WHEN j.type='integer' AND j.value BETWEEN 0 AND 5 THEN j.value END) AS average,
   ${[0,1,2,3,4,5].map(v=>`SUM(CASE WHEN j.type='integer' AND j.value=${v} THEN 1 ELSE 0 END) AS rank${v}`).join(',')}
  FROM games g
  LEFT JOIN rounds r ON r.room_code=g.code AND r.skipped=0
  LEFT JOIN ballots b ON b.room_code=r.room_code AND b.round=r.number AND b.abstained=0
  LEFT JOIN json_each(COALESCE(b.rankings,'{}')) j ON g.mode='players' AND j.key=g.member_id
  GROUP BY g.code ORDER BY g.finished_at DESC,g.code
 `).bind(profileId,Date.now()).all<Record<string,any>>()).results;
 const received=[0,0,0,0,0,0];let roundVotes=0;
 for(const g of history){roundVotes+=Number(g.roundVotes);for(let v=0;v<6;v++)received[v]+=Number(g['rank'+v]);}
 // Questions are kept verbatim: a high score does not imply a positive trait.
 const memories=(await db.prepare(`
  WITH games AS (
   SELECT r.code,m.id AS member_id FROM rooms r JOIN members m ON m.room_code=r.code
   WHERE m.profile_id=? AND r.status='finished' AND m.state!='kicked'
    AND m.id IN (SELECT value FROM json_each(r.roster)) AND r.expires_at>?
   ORDER BY r.finished_at DESC,r.code LIMIT 100
  )
  SELECT q.question,COUNT(*) AS votes,COUNT(DISTINCT g.code || ':' || q.number) AS rounds,
   AVG(j.value) AS average,SUM(CASE WHEN j.value=5 THEN 1 ELSE 0 END) AS sCount
  FROM games g JOIN rooms r ON r.code=g.code AND r.mode='players'
  JOIN rounds q ON q.room_code=g.code AND q.skipped=0 AND q.question IS NOT NULL
  JOIN ballots b ON b.room_code=q.room_code AND b.round=q.number AND b.abstained=0
  JOIN json_each(b.rankings) j ON j.key=g.member_id AND j.type='integer' AND j.value BETWEEN 0 AND 5
  GROUP BY q.question ORDER BY sCount DESC,votes DESC,q.question LIMIT 12
 `).bind(profileId,Date.now()).all<{question:string;votes:number;rounds:number;average:number;sCount:number}>()).results;
 const milestones=[
  {id:"first",name:"Première soirée",description:"Terminer une partie",progress:history.length,goal:1},
  {id:"regular",name:"Habitué de la bande",description:"Terminer 5 parties",progress:history.length,goal:5},
  {id:"verdicts",name:"La voix du débat",description:"Envoyer 50 classements",progress:roundVotes,goal:50},
 ].map(b=>({...b,earned:b.progress>=b.goal}));
 const totalReceived=received.reduce((s,n)=>s+n,0);
 return {memories,milestones,games:history.length,roundVotes,received,average:totalReceived?received.reduce((s,n,i)=>s+n*i,0)/totalReceived:null,totalReceived,history,scope:"100 dernières parties terminées"};
}
