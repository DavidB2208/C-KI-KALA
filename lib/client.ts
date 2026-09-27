import { playerTabScope } from "./player-tab";
export class ApiError extends Error{constructor(message:string,public status:number,public code?:string){super(message);}}
export async function api<T=any>(path:string,method="GET",body?:unknown):Promise<T>{
 const scope=playerTabScope();
 const response=await fetch("/api/"+path,{method,headers:{...(scope?{"X-CKK-Player":scope}:{}),...(method==="GET"?{}:{"Content-Type":"application/json","X-CKK-Request":"1"})},...(method!=="GET"?{body:JSON.stringify(body??{})}:{}),cache:"no-store"});
 const data:any=await response.json().catch(()=>({error:"Réponse indisponible. Réessaie."}));
 if(!response.ok)throw new ApiError(data.error??"L’action a échoué.",response.status,typeof data.code==="string"?data.code:undefined);return data;
}
export const errorMessage=(e:unknown)=>e instanceof Error?e.message:"Un problème est survenu. Réessaie.";
