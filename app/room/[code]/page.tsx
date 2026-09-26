import { GameApp } from "@/components/game-app";
export const dynamic="force-dynamic";
export default async function Room({params}:{params:Promise<{code:string}>}){return <GameApp view="room" code={(await params).code.toUpperCase()}/>;}
