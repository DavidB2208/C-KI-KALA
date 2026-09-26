import { type Result, type Target } from "./game-data";
export class GameError extends Error { constructor(public status:number,message:string){super(message);} }
export function validateBallot(rankings:Record<string,number|null>,targets:Target[],memberId:string,mode:string,abstain:boolean){
 const expected=targets.filter(t=>mode!=="players"||t.id!==memberId).map(t=>t.id);
 const keys=Object.keys(rankings);
 if(abstain){if(keys.length)throw new GameError(400,"Une abstention ne contient aucun classement.");return;}
 if(keys.length!==expected.length||keys.some(k=>!expected.includes(k))||expected.some(k=>rankings[k]!==null&&(!Number.isInteger(rankings[k])||rankings[k]!<0||rankings[k]!>5)))throw new GameError(400,"Place chaque élément dans un rang ou dans Non classé, sans te classer toi-même.");
 if(!Object.values(rankings).some(v=>v!==null))throw new GameError(400,"Classe au moins un élément ou passe ton vote.");
}
export function aggregate(targets:Target[],ballots:{rankings:string;abstained:number}[]):Result[]{
 const scores=new Map(targets.map(t=>[t.id,{...t,total:0,votes:0,sCount:0,distribution:[0,0,0,0,0,0]}]));
 for(const b of ballots){if(b.abstained)continue;const ranking=JSON.parse(b.rankings) as Record<string,number>;for(const [id,v] of Object.entries(ranking)){const s=scores.get(id);if(!s||!Number.isInteger(v)||v<0||v>5)continue;s.total+=v;s.votes++;s.distribution[v]++;if(v===5)s.sCount++;}}
 return [...scores.values()].map(({total,...s})=>({...s,average:s.votes?total/s.votes:0})).filter(s=>s.votes>0).sort((a,b)=>b.average-a.average||a.name.localeCompare(b.name,"fr"));
}
export function shuffle<T>(items:readonly T[]):T[]{const copy=[...items];for(let i=copy.length-1;i>0;i--){const rand=crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;const j=Math.floor(rand*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
