/** Creates development credentials only, without replacing existing configuration. */
import { randomBytes,createHash } from 'node:crypto';
import { writeFile,mkdir,access } from 'node:fs/promises';
const root=new URL('../',import.meta.url),config=new URL('.dev.vars',root);
try{await access(config);console.log('Configuration locale déjà présente : aucun fichier remplacé.');process.exit(0);}catch(e){if(e.code!=='ENOENT')throw e;}
const code=randomBytes(32).toString('hex');
await mkdir(new URL('.local/',root),{recursive:true,mode:0o700});
await writeFile(new URL('.local/owner-activation.txt',root),`Compte administrateur de développement uniquement\nURL : http://localhost:5173/admin/activate\nE-mail : owner@example.test\nCode privé : ${code}\nValable 24 h. Choisis ton propre mot de passe sur la page.\nNe pas copier en production ni partager ce fichier.\n`,{flag:'wx',mode:0o600});
const values={BETTER_AUTH_SECRET:randomBytes(32).toString('hex'),CKK_APP_ORIGIN:'http://localhost:5173',CKK_OWNER_EMAIL:'owner@example.test',CKK_OWNER_SETUP_HASH:createHash('sha256').update(code).digest('hex'),CKK_OWNER_SETUP_EXPIRES:String(Date.now()+86400000),CKK_BILLING_MODE:'off',CKK_BILLING_READY:'0',CKK_CHECKOUT_OPEN:'0'};
await writeFile(config,Object.entries(values).map(([k,v])=>`${k}=${v}`).join('\n')+'\n',{flag:'wx',mode:0o600});
console.log('Configuration de développement créée. Le code propriétaire est dans .local/owner-activation.txt (non versionné).');
console.log('Ensuite : pnpm db:migrate:local puis pnpm dev. Aucun paiement réel n’est activé.');
