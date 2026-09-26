/** Small publication hygiene gate; complements, never replaces, a security audit. */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const files=execFileSync('git',['ls-files','-c','-o','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const errors=[];
const knownFixtures=new Set(['sk_test_isolated_not_real','whsec_isolated_tests_only']);
for(const file of new Set(files)){
 if(/(^|\/)(\.dev\.vars[^/]*|\.env(?!\.example$)[^/]*|\.local|\.wrangler|node_modules)(\/|$)|\.(sqlite3?|db|pem|key)$/i.test(file))errors.push(file+': fichier privé ou généré');
 const source=readFileSync(file).toString('utf8');
 const hits=source.match(/(?:sk_live_|sk_test_|whsec_|ghp_|github_pat_)[A-Za-z0-9_]{16,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g)??[];
 if(hits.some(v=>!(['tests/billing-integration.mjs','scripts/check-source.mjs'].includes(file)&&knownFixtures.has(v))))errors.push(file+': valeur ressemblant à un secret');
}
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log(`Source contrôlée : ${new Set(files).size} fichiers ; aucun fichier privé ou secret reconnu.`);
