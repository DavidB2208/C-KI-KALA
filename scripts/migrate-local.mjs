import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
if(process.argv.length>2)throw Error('Cette commande ne prend aucun argument : elle est réservée à la base locale.');
const result=spawnSync(process.execPath,[fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js',import.meta.url)),'d1','migrations','apply','DB','--local','--config','wrangler.local.jsonc','--persist-to','.wrangler/state'],{cwd:fileURLToPath(new URL('../',import.meta.url)),stdio:'inherit'});
if(result.error)throw result.error;process.exit(result.status??1);
