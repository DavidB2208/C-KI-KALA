import { TIERS,scoreTier,type Result } from "./game-data";

// This renderer runs locally in the browser. No room URL, identifier or vote
// attribution is embedded, and no image is uploaded by the application.
export async function resultImage({results,title,subtitle,story,names,origin}:{results:Result[];title:string;subtitle:string;story:boolean;names:boolean;origin:string}){
 await document.fonts.ready;
 const canvas=document.createElement("canvas");canvas.width=story?1080:1200;
 const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Image indisponible");
 const font=(size:number,weight=500)=>`${weight} ${size}px "Jost Variable", sans-serif`;
 const textWidth=canvas.width-100;
 let titleSize=story?48:38;
 ctx.font=font(titleSize,700);
 let lines:string[]=[];let line="";
 // Wrap even a single long unbroken word, without clipping user-entered text.
 for(const char of title){if(ctx.measureText(line+char).width>textWidth&&line){lines.push(line.trim());line="";}line+=char;}
 if(line.trim())lines.push(line.trim());
 const columns=story?2:3;
 const rowStep=story?95:70;
 const heights=TIERS.map(t=>Math.max(story?140:108,Math.ceil(results.filter(r=>scoreTier(r.average).key===t.key).length/columns)*rowStep+30));
 const boardHeight=heights.reduce((a,b)=>a+b,0);
 let header=150+lines.length*(titleSize+10)+65;
 while(story&&header+boardHeight+155>1920&&titleSize>28){
  titleSize-=2;ctx.font=font(titleSize,700);lines=[];line="";
  for(const char of title){if(ctx.measureText(line+char).width>textWidth&&line){lines.push(line.trim());line="";}line+=char;}
  if(line.trim())lines.push(line.trim());header=150+lines.length*(titleSize+10)+65;
 }
 canvas.height=story?1920:header+boardHeight+165;
 const background=ctx.createLinearGradient(0,0,canvas.width,canvas.height);background.addColorStop(0,"#201035");background.addColorStop(1,"#090a18");ctx.fillStyle=background;ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.fillStyle="#c9a4ff";ctx.font=font(25,700);ctx.fillText("C KI KA LA / HALLILA GAMES",50,70);
 ctx.fillStyle="#fff";ctx.font=font(titleSize,700);lines.forEach((l,i)=>ctx.fillText(l,50,150+i*(titleSize+10)));
 ctx.fillStyle="#c5b3da";ctx.font=font(23);ctx.fillText(subtitle,50,header-32,textWidth);
 let y=header;
 const cellWidth=(textWidth-112)/columns;
 for(const [index,t] of TIERS.entries()){
  const entries=results.filter(r=>scoreTier(r.average).key===t.key),height=heights[index];
  ctx.fillStyle="#281d37";ctx.fillRect(50,y,textWidth,height-10);ctx.fillStyle=t.color;ctx.fillRect(50,y,85,height-10);
  ctx.fillStyle="#150c20";ctx.font=font(48,800);ctx.fillText(t.key,74,y+65);
  entries.forEach((r,i)=>{
   const x=155+i%columns*cellWidth,top=y+20+Math.floor(i/columns)*rowStep;
   const label=names?r.name:"Nom "+(results.indexOf(r)+1);
   ctx.fillStyle="#fff";ctx.font=font(story?42:25,600);
   let shown=label;while(ctx.measureText(shown).width>cellWidth-20&&shown.length>1)shown=shown.slice(0,-1);
   if(shown!==label)shown=shown.slice(0,-1)+"…";
   ctx.fillText(shown,x,top+(story?36:24));
   ctx.fillStyle="#c5b3da";ctx.font=font(story?30:20);ctx.fillText(`${r.average.toFixed(2)} / 5 · ${r.votes} vote${r.votes>1?"s":""}`,x,top+(story?75:52),cellWidth-20);
  });y+=height;
 }
 const footer=story?Math.max(y+45,canvas.height-200):y+42;
 ctx.fillStyle="#c5b3da";ctx.font=font(story?28:20);ctx.fillText("Moyennes reçues · abstentions et non classés exclus",50,footer,textWidth);
 ctx.fillStyle="#fff";ctx.font=font(story?40:30,700);ctx.fillText("Teste avec tes potes.",50,footer+52);
 ctx.fillStyle="#bc91fb";ctx.font=font(story?28:22);ctx.fillText(origin.replace(/^https?:\/\//,""),50,footer+88,textWidth);
 return new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Export indisponible")),"image/png"));
}
