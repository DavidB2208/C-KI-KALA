import { PREMIUM_PACKS } from "./game-data";
export type Offer={id:string;name:string;cents:number;interval?:"month"|"year";kind:"pass"|"plus"|"pack";packId?:string;description:string};
export const OFFERS:Offer[]=[
 {id:"party",name:"Party Pass",cents:299,kind:"pass",description:"24 heures de packs Premium et de thèmes pour les parties que tu lances. Sans renouvellement."},
 {id:"plus-month",name:"C KI KA LA+ mensuel",cents:499,interval:"month",kind:"plus",description:"Tous les packs Premium et les thèmes pour tes salles, avec analyses avancées. Renouvellement mensuel, résiliable."},
 {id:"plus-year",name:"C KI KA LA+ annuel",cents:3499,interval:"year",kind:"plus",description:"Les mêmes avantages, avec renouvellement annuel. Résiliable depuis ton espace d’abonnement."},
 ...PREMIUM_PACKS.map(p=>({id:"pack-"+p.id,name:p.name,cents:299,kind:"pack" as const,packId:p.id,description:`Les ${p.questionCount} questions de ce pack pour tes salles, sans abonnement. Accès tant que le service propose ce contenu.`}))
];
export const offerFor=(sku:string)=>OFFERS.find(o=>o.id===sku);
export const euro=(cents:number)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(cents/100);
