/** Starts the real portable dev command in a clean temporary checkout.
 * No production bindings, credentials, data or browser sessions are used.
 */
import assert from 'node:assert/strict';
import { spawn,execFileSync } from 'node:child_process';
import { mkdtemp,mkdir,copyFile,symlink,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve,dirname,join } from 'node:path';
import http from 'node:http';
import net from 'node:net';
const project=resolve('.'),temporary=await mkdtemp(join(tmpdir(),'ckk-local-dev-'));
let child,log='',passed=0;
function check(name,value){assert.ok(value,name);passed++;console.log('PASS',name);}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
try{
 const files=[...new Set(execFileSync('git',['ls-files','-c','-o','--exclude-standard','-z'],{cwd:project,encoding:'utf8'}).split('\0').filter(Boolean))];
 for(const file of files){const destination=join(temporary,file);await mkdir(dirname(destination),{recursive:true});await copyFile(join(project,file),destination);}
 await symlink(join(project,'node_modules'),join(temporary,'node_modules'),process.platform==='win32'?'junction':'dir');
 const server=net.createServer();await new Promise((r,j)=>{server.once('error',j);server.listen(0,'localhost',r);});
 const port=server.address().port;await new Promise(r=>server.close(r));
 const origin='http://localhost:'+port;
 child=spawn(process.execPath,['scripts/run-framework.mjs','dev','--port',String(port)],{cwd:temporary,env:{...process.env,CI:'true'},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',v=>log+=v);child.stderr.on('data',v=>log+=v);
 const finished=new Promise(r=>child.once('exit',r));
 const cookies=new Map();
 function call(path,method='GET',body,scope='',declaredOrigin=origin){
  return new Promise((resolve,reject)=>{
   const headers={Host:new URL(declaredOrigin).host,...(scope?{'X-CKK-Player':scope}:{}),Cookie:[...cookies].map(([k,v])=>k+'='+v).join('; '),...(method!=='GET'?{Origin:declaredOrigin,'Content-Type':'application/json','X-CKK-Request':'1','Sec-Fetch-Site':'same-origin'}:{})};
   const req=http.request(origin+'/api/'+path,{method,headers,timeout:20000},res=>{let raw='';res.on('data',v=>raw+=v);res.on('end',()=>{
    for(const value of res.headers['set-cookie']??[]){const first=value.split(';')[0],i=first.indexOf('='),key=first.slice(0,i),v=first.slice(i+1);if(!v||/max-age=0/i.test(value))cookies.delete(key);else cookies.set(key,v);}
    try{resolve({status:res.statusCode,data:JSON.parse(raw)});}catch{reject(Error(path+': non-JSON status '+res.statusCode));}
   });});req.on('timeout',()=>req.destroy(Error('HTTP timeout')));req.on('error',reject);req.end(method==='GET'?undefined:JSON.stringify(body??{}));
  });
 }
 async function ok(...args){const r=await call(...args);assert.equal(r.status,200,`${args[0]}: ${r.data.error??r.status}`);return r.data;}
 let ready=false;
 for(let attempt=0;attempt<240;attempt++){
  if(child.exitCode!==null)throw Error('Dev server exited');
  if(log.includes('Local:')){try{if((await call('me')).status===200){ready=true;break;}}catch{}}
  await pause(250);
 }
 check('Fresh pnpm dev prepares configuration and all database migrations',ready);
 const config=await readFile(join(temporary,'.dev.vars'),'utf8');
 check('Local setup pins its documented origin',config.includes('CKK_APP_ORIGIN=http://localhost:5173'));
 const signup=await ok('auth/sign-up/email','POST',{name:'Hote local',email:crypto.randomUUID()+'@example.test',password:'Compte de test local 2026!'});
 check('Registration works on a different localhost port',signup.ok&&!!signup.recoveryCode);
 const me=await ok('me');check('Registration persists a real session',me.signedIn&&me.profile.name==='Hote local');
 const second=crypto.randomUUID().replaceAll('-',''),third=crypto.randomUUID().replaceAll('-','');
 check('Another tab does not inherit account identity',(await ok('me','GET',undefined,second)).profile===null);
 await ok('profile','POST',{name:'Deuxieme local'},second);await ok('profile','POST',{name:'Troisieme local'},third);
 const code=(await ok('rooms','POST',{pack:'classique',roundCount:1,duration:120,mode:'players',themeMode:'pack'})).code,path='rooms/'+code;
 await ok(path+'/join','POST',{},second);await ok(path+'/join','POST',{},third);
 check('Three local players share one room and one browser cookie jar',(await ok(path)).members.length===3);
 const before=(await ok('me','GET',undefined,second)).profile.id;
 check('Repeated requests recover the correct player',(await ok('me','GET',undefined,second)).profile.id===before&&(await ok('me')).profile.id===me.profile.id);
 const alias='http://127.0.0.1:'+port;
 const aliasResult=await ok('auth/sign-up/email','POST',{name:'Alias local',email:crypto.randomUUID()+'@example.test',password:'Compte alias local 2026!'},crypto.randomUUID().replaceAll('-',''),alias);
 check('Loopback Host alias also accepts same-origin registration',aliasResult.ok);
 const rootBefore=(await ok('me')).profile.id;
 const bad=await call('auth/sign-up/email','POST',{name:'Erreur locale',email:'invalid',password:'short'});
 check('Invalid registration preserves the existing session',bad.status===400&&(await ok('me')).profile.id===rootBefore);
 child.kill('SIGTERM');await Promise.race([finished,pause(5000)]);
 console.log(JSON.stringify({passed,test:'Clean portable checkout + real dev HTTP server, alternate port and shared-cookie tabs'}));
}catch(e){console.error(log.slice(-4500));throw e;}
finally{if(child&&child.exitCode===null)child.kill('SIGKILL');await rm(temporary,{recursive:true,force:true,maxRetries:5,retryDelay:200});}
