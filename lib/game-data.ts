export const TIERS = [
 { key:"S", value:5, color:"#F93E4C", label:"Tout à fait" },
 { key:"A", value:4, color:"#FC983A", label:"Beaucoup" },
 { key:"B", value:3, color:"#E6D739", label:"Plutôt oui" },
 { key:"C", value:2, color:"#4DBD32", label:"Un peu" },
 { key:"D", value:1, color:"#33D3CF", label:"Très peu" },
 { key:"E", value:0, color:"#DF37BD", label:"Pas du tout" }
] as const;
const FREE_PACKS = [
 {id:"classique",name:"Les classiques",label:"POUR BRISER LA GLACE",symbol:"S+",color:"#b891fb",glow:"#9260e53d",description:"Des petites vérités qui font les grandes soirées.",vibe:"Tout public",questions:["Qui est le plus drôle ?","Qui serait le meilleur colocataire ?","Qui est le plus crédible quand il ment ?","Qui est le plus susceptible de devenir célèbre ?","Qui a le plus de flow ?","Qui est le plus mauvais perdant ?","Qui met le plus d’ambiance dans le groupe ?","Qui oublierait son propre anniversaire ?","Qui ferait le meilleur guide touristique ?","Qui se ferait des amis dans une file d’attente ?","Qui est le plus compétitif pour rien ?","Qui parle le plus pendant un film ?","Qui met le plus de temps à choisir au restaurant ?","Qui a toujours une anecdote improbable ?","Qui serait le meilleur capitaine d’équipe ?","Qui rit au mauvais moment ?","Qui serait le meilleur présentateur télé ?","Qui est le plus doué pour improviser ?","Qui transforme un petit problème en grande aventure ?","Qui est le plus difficile à surprendre ?"]},
 {id:"chaos",name:"Chaos entre potes",label:"LA MAUVAISE FOI INCLUSE",symbol:"?!",color:"#fbac76",glow:"#b9602938",description:"Zéro logique. Beaucoup trop de débats.",vibe:"Absurde",questions:["Qui est le plus chaotique ?","Qui survivrait le moins longtemps dans un film d’horreur ?","Qui lancerait une révolution pour une part de pizza ?","Qui pourrait se perdre dans sa propre rue ?","Qui essaierait de négocier avec un zombie ?","Qui créerait un fan-club pour un grille-pain ?","Qui achèterait un château sur un coup de tête ?","Qui serait éliminé en premier d’une émission de survie ?","Qui deviendrait ami avec le méchant du film ?","Qui commanderait un dessert pendant une évacuation ?","Qui pourrait devenir une légende urbaine ?","Qui transformerait une réunion en karaoké ?","Qui essaierait de dompter un pigeon ?","Qui inventerait un sport complètement inutile ?","Qui serait le pire espion ?","Qui oublierait trois fois pourquoi il est entré dans une pièce ?","Qui organiserait un concours pendant une panne de courant ?","Qui partirait en week-end dans le mauvais pays ?","Qui se croirait capable de battre un robot aux échecs ?","Qui voudrait garder un dragon en appartement ?"]},
 {id:"dossiers",name:"Petits dossiers",label:"VOUS VOUS CONNAISSEZ TROP",symbol:"…",color:"#e493bc",glow:"#b84e9538",description:"Les habitudes que vos potes n’ont pas oubliées.",vibe:"Entre proches",questions:["Qui est le plus susceptible de laisser un message en vu ?","Qui regarde le plus son propre profil ?","Qui dit « j’arrive » alors qu’il est encore chez lui ?","Qui dramatise le plus ses histoires ?","Qui refait dix fois le même selfie ?","Qui prétend connaître un artiste qu’il découvre ?","Qui garderait un secret le moins longtemps ?","Qui fait le plus de promesses au réveillon ?","Qui est le plus susceptible de se tromper de conversation ?","Qui a la pire excuse pour annuler un plan ?","Qui se prend le plus au sérieux au karaoké ?","Qui répond à un vocal par un podcast ?","Qui grignote le plus le repas des autres ?","Qui se prépare le plus longtemps pour rester chez lui ?","Qui fait semblant d’avoir compris les règles ?","Qui raconterait une histoire en oubliant la fin ?","Qui donne les meilleurs conseils qu’il ne suit jamais ?","Qui lancerait un débat à trois heures du matin ?","Qui parle le plus à son animal ?","Qui prétend ne pas aimer les potins mais écoute quand même ?"]}
] as const;
export const PREMIUM_PACKS=[
 {id:"anime",name:"Arc entre potes",label:"VOTRE PROPRE ANIME",symbol:"超",color:"#fd858f",glow:"#a92b4540",description:"Une équipe, des pouvoirs improbables et beaucoup trop de monologues.",vibe:"Anime",questionCount:20,premium:true,questions:["Qui ferait le discours le plus long avant un combat ?","Qui aurait un pouvoir incroyable mais oublierait comment l’utiliser ?","Qui recruterait le méchant dans son équipe ?"]},
 {id:"campus",name:"Campus",label:"LA PROMO A DES DOSSIERS",symbol:"A+",color:"#63d6bb",glow:"#267c6940",description:"Projets de groupe, exposés improvisés et légendes de promo.",vibe:"Vie étudiante",questionCount:20,premium:true,questions:["Qui transformerait un travail de groupe en réunion de crise ?","Qui découvrirait la date du rendu la veille ?","Qui ferait une présentation sans ouvrir ses notes ?"]},
 {id:"apocalypse",name:"Fin du monde",label:"LA BANDE SURVIVRA-T-ELLE ?",symbol:"!!",color:"#f6ba61",glow:"#a96b2440",description:"Un abri, un plan douteux et vos instincts de survie.",vibe:"Survie absurde",questionCount:20,premium:true,questions:["Qui négocierait avec les extraterrestres ?","Qui emporterait une enceinte au lieu d’une lampe ?","Qui saurait réparer le véhicule du groupe ?"]},
 {id:"redflags",name:"Red Flags",label:"À JOUER ENTRE PROCHES",symbol:"?!",color:"#f38daf",glow:"#a42f5940",description:"Messages décortiqués et rendez-vous improbables. On se chambre avec accord.",vibe:"Relations",questionCount:20,premium:true,questions:["Qui dirait qu’il n’est pas jaloux en posant douze questions ?","Qui analyserait un message avec tout le groupe ?","Qui proposerait un rendez-vous sans choisir le lieu ?"]}
] as const;
export const PACKS=[...FREE_PACKS,...PREMIUM_PACKS];
export const isPremiumPack=(id:string)=>PREMIUM_PACKS.some(p=>p.id===id);
export const packSize=(pack:typeof PACKS[number])=>"questionCount" in pack?pack.questionCount:pack.questions.length;
export const AVATARS=["#ae70f0","#f95578","#42ba8a","#3a98df","#ed994e","#d4bb43","#37afba","#dc63ca"];
export const getPack=(id:string)=>PACKS.find(p=>p.id===id)??PACKS[0];
export const scoreTier=(value:number)=>TIERS.find(t=>t.value===Math.max(0,Math.min(5,Math.round(value))))!;
export type View="home"|"packs"|"stats"|"account"|"rules"|"privacy"|"room"|"demo"|"sets"|"admin"|"activate"|"squads"|"decks"|"offers"|"terms";
export type Person={id:string;name:string;avatar:number;isAccount:boolean;role?:string};
export type Member={id:string;name:string;avatar:number;state:string;last_seen:number;isHost:boolean};
export type Target={id:string;name:string;avatar:number};
export type Result=Target&{average:number;votes:number;sCount:number;distribution:number[]};
export type Ranking=Record<string,number|null>;
export type RevealedBallot={memberId:string;name:string;avatar:number;rankings:Ranking;abstained:boolean};
export type BallotRound={number:number;question:string|null;ballots:RevealedBallot[]};
export type RoomState={
 squad:{id:string;name:string;canConsent:boolean;myConsent:boolean;accepted:number;total:number;published:boolean}|null;deckName:string|null;visualTheme:string;myQuestionRating:1|-1|null;code:string;status:string;pack:string;roundCount:number;currentRound:number;duration:number;mode:string;themeMode:string;setName:string;
 me:string;hostId:string;members:Member[];question:string|null;deadline:number|null;serverTime:number;
 roster:string[];targets:Target[];submitted:string[];myBallot:Ranking|null;myAbstention:boolean;revealedBallots:RevealedBallot[];ballotRounds:BallotRound[];
 results:Result[];finalResults:Result[];reportCount:number;skipped:boolean;createdAt:number;proposals:{id:string;text:string;author:string}[];
};
export type SavedSet={id:string;name:string;items:string[]};
