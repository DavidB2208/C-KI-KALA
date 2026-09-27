/** Exercises the built Worker and a disposable D1 database. Never contacts production.
 * The fixture wrapper exists only inside this test process; it is not shipped.
 * Real email/password sessions exercise the same auth implementation as production.
 */
import { socialCases } from './social-cases.mjs';
import { playerTabCases } from './player-tab-cases.mjs';
import { createRequire } from 'node:module';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
const require = createRequire(import.meta.resolve('wrangler/package.json'));
const { Miniflare } = require('miniflare');
const root = resolve('dist/server');
const files = (await readdir(root, { recursive: true })).filter(p => /\.m?js$/.test(p));
const origin = 'https://localhost';
const setupCode=randomBytes(32).toString('hex');
const ownerEmail='owner@example.test';
const legacyId='legacy-owner-profile';
const mf = new Miniflare({
  host: '127.0.0.1', cf: false, compatibilityDate: '2026-05-15',
  compatibilityFlags: ['nodejs_compat'], d1Databases: { DB: 'isolated-ckk-tests' },
  bindings: {BETTER_AUTH_SECRET:randomBytes(32).toString('hex'),CKK_APP_ORIGIN:origin,CKK_OWNER_EMAIL:ownerEmail,CKK_OWNER_SETUP_HASH:createHash('sha256').update(setupCode).digest('hex'),CKK_OWNER_SETUP_EXPIRES:String(Date.now()+3600000),CKK_OWNER_LEGACY_PROFILE_ID:legacyId},
  modulesRoot: root,
  modules: [{ type: 'ESModule', path: resolve(root, 'test-entry.js'), contents: `
    import app from './index.js';
    export default {async fetch(r,e,c){
      if(new URL(r.url).pathname==='/__fixture'){
        const queries=await r.json();
        for(const sql of queries) await e.DB.exec(sql);
        return Response.json({ok:true});
      }
      if(new URL(r.url).pathname==='/__inspect'){
        const {sql,params}=await r.json();return Response.json((await e.DB.prepare(sql).bind(...params).all()).results);
      }
      return app.fetch(r,e,c);
    }};
  ` }, ...files.map(p => ({ type: 'ESModule', path: resolve(root, p) }))],
});
let passed = 0;
function check(name, condition) { assert.ok(condition, name); passed++; console.log('PASS', name); }
async function fixture(queries) {
  const r = await mf.dispatchFetch(origin + '/__fixture', { method: 'POST', body: JSON.stringify(queries) });
  assert.equal(r.status, 200, await r.text());
}
async function inspect(sql,...params){const r=await mf.dispatchFetch(origin+'/__inspect',{method:'POST',body:JSON.stringify({sql,params})});assert.equal(r.status,200);return r.json();}
let clientCount=0;
class Client {
  cookies=new Map(); headers = {}; account=false;
  email='player-'+crypto.randomUUID()+'@example.test'; password='Le dragon violet danse 2026!';
  ip='192.0.2.'+(++clientCount);
  constructor(account = false) {
    this.account=account;
  }
  get cookie(){return [...this.cookies].map(([k,v])=>k+'='+v).join('; ');}
  set cookie(value){this.cookies=new Map(value.split('; ').filter(Boolean).map(c=>{const pos=c.indexOf('=');return [c.slice(0,pos),c.slice(pos+1)];}));}
  async register(name){const r=await this.ok('auth/sign-up/email','POST',{name,email:this.email,password:this.password});this.recoveryCode=r.recoveryCode;return r;}
  async login(){return this.ok('auth/sign-in/email','POST',{email:this.email,password:this.password});}
  async call(path, method = 'GET', body = {}, extra = {}) {
    const headers = { ...this.headers,'CF-Connecting-IP':this.ip, ...(this.cookie ? { Cookie: this.cookie } : {}),
      ...(method !== 'GET' ? { Origin: origin, 'Content-Type': 'application/json', 'X-CKK-Request': '1' } : {}), ...extra };
    const r = await mf.dispatchFetch(origin + '/api/' + path, { method, headers, ...(method !== 'GET' ? { body: JSON.stringify(body) } : {}) });
    const cookie = r.headers.get('set-cookie');
    for(const value of r.headers.getSetCookie()){
      const first=value.split(';')[0],pos=first.indexOf('=');const key=first.slice(0,pos),v=first.slice(pos+1);
      if(!v||/max-age=0/i.test(value))this.cookies.delete(key);else this.cookies.set(key,v);
    }
    const raw = await r.text(); let data;
    try { data = JSON.parse(raw); } catch { throw new Error(`${path}: ${r.status} ${raw.slice(0,300)}`); }
    return { status: r.status, data, cookie, headers: r.headers };
  }
  async ok(path, method = 'GET', body = {}) { const r = await this.call(path, method, body); assert.equal(r.status, 200, path + ': ' + JSON.stringify(r.data)); return r.data; }
}
try {
  await mf.ready;
  for(const migration of (await readdir('drizzle')).filter(p=>p.endsWith('.sql')).sort()){
    const sql=await readFile('drizzle/'+migration,'utf8');
    await fixture(sql.split('--> statement-breakpoint').filter(s=>s.trim()).map(s=>s.replace(/\n/g,' ')));
  }
  await fixture([`INSERT INTO profiles(id,auth_subject,name,avatar,created_at) VALUES('${legacyId}','old-siwc-id','David',0,1)`,`INSERT INTO saved_sets(id,owner_id,name,items,updated_at) VALUES('legacy-set','${legacyId}','Ancien set','["Ariel","Isaac"]',1)`]);
  const h = new Client(true), i = new Client(), l = new Client(), x = new Client(), other = new Client(true);
  check('Anonymous visitors have no account', (await x.ok('me')).profile === null);
  const spoof=new Client();spoof.headers={'oai-authenticated-user-id':'old-siwc-id','oai-authenticated-user-email':ownerEmail};
  check('ChatGPT headers cannot grant an account',!(await spoof.ok('me')).signedIn);
  check('Cross-origin registration rejected',(await x.call('auth/sign-up/email','POST',{name:'Intruder',email:x.email,password:x.password},{Origin:'https://evil.example'})).status===403);
  check('Client role injection rejected',(await x.call('auth/sign-up/email','POST',{name:'Intruder',email:x.email,password:x.password,role:'owner'})).status===400);
  check('Foreign-origin writes rejected', (await x.call('profile','POST',{name:'Intruder'},{Origin:'https://evil.example'})).status === 403);
  check('Missing request header rejected', (await x.call('profile','POST',{name:'Intruder'},{'X-CKK-Request':''})).status === 403);
  check('HTML nickname rejected', (await x.call('profile','POST',{name:'<script>alert(1)</script>'})).status === 400);
  for (const [c, name] of [[h,'Hote'],[i,'Isaac'],[l,'Liam'],[x,'Intrus'],[other,'Autre']]) {if(c.account)await c.register(name);await c.ok('profile','POST',{name,avatar:0});}
  check('Accounts authenticate without ChatGPT',(await h.ok('me')).signedIn&&(await h.ok('me')).email===h.email);
  check('Account cookie HttpOnly',h.cookie.includes('ckk.session_token='));
  const [stored]=await inspect('SELECT a.password,u.emailVerified FROM auth_account a JOIN auth_user u ON u.id=a.userId WHERE u.email=?',h.email);
  check('Passwords hashed and email not falsely verified',stored.password!==h.password&&stored.password.length>100&&!stored.emailVerified);
  const authTest=new Client();await authTest.register('Secours');
  const device=new Client();device.email=authTest.email;device.password=authTest.password;await device.login();
  check('Invalid password rejected',(await device.call('auth/sign-in/email','POST',{email:device.email,password:'incorrect'})).status===401);
  await authTest.ok('auth/revoke-other-sessions','POST');
  check('Other devices revoked',!(await device.ok('me')).signedIn&&(await authTest.ok('me')).signedIn);
  await device.login();
  const nextPassword='Le dragon bleu chante 2026!';
  await authTest.ok('auth/change-password','POST',{currentPassword:authTest.password,newPassword:nextPassword});
  check('Password change revokes other devices',!(await device.ok('me')).signedIn);
  check('Old password no longer accepted',(await device.call('auth/sign-in/email','POST',{email:device.email,password:device.password})).status===401);
  authTest.password=nextPassword;device.password=nextPassword;await device.login();
  const oldRecovery=authTest.recoveryCode;
  const rotated=await authTest.ok('auth/rotate-recovery','POST',{password:authTest.password});
  check('Previous recovery code invalidated',(await device.call('auth/recover','POST',{email:device.email,code:oldRecovery,newPassword:device.password})).status===400);
  const recovered=await device.ok('auth/recover','POST',{email:device.email,code:rotated.recoveryCode,newPassword:'Le dragon vert vole 2026!'});
  check('Recovery rotates code and revokes every session',recovered.recoveryCode!==rotated.recoveryCode&&!(await authTest.ok('me')).signedIn&&!(await device.ok('me')).signedIn);
  check('Recovery code cannot be replayed',(await device.call('auth/recover','POST',{email:device.email,code:rotated.recoveryCode,newPassword:device.password})).status===400);
  device.password='Le dragon vert vole 2026!';await device.login();await device.ok('auth/sign-out','POST');
  check('Sign out invalidates session',!(await device.ok('me')).signedIn);
  await device.login();
  const fixedExpiry=Date.now()+3600000;
  await inspect('UPDATE auth_session SET updatedAt=?,expiresAt=? WHERE userId=(SELECT id FROM auth_user WHERE email=?)',Date.now()-86400000*2,fixedExpiry,device.email);
  await device.ok('me');
  check('Session reads cannot silently extend expiry',(await inspect('SELECT expiresAt FROM auth_session WHERE userId=(SELECT id FROM auth_user WHERE email=?)',device.email))[0].expiresAt===fixedExpiry);
  await inspect('UPDATE auth_session SET expiresAt=0 WHERE userId=(SELECT id FROM auth_user WHERE email=?)',device.email);
  check('Expired sessions rejected',!(await device.ok('me')).signedIn);
  check('Opaque guest token', i.cookie.split('=')[1].length === 64);
  const guestCookie = (await new Client().call('profile','POST',{name:'Invite'})).cookie;
  check('Guest cookie HttpOnly and SameSite', /HttpOnly/.test(guestCookie) && /SameSite=Lax/.test(guestCookie));
  check('Guests cannot read account stats', (await i.call('stats')).status === 401);
  const upgraded = new Client(); await upgraded.ok('profile','POST',{name:'Upgrade'});
  const oldCookie = upgraded.cookie;const beforeUpgrade=(await upgraded.ok('me')).profile.id;await upgraded.register('Upgrade');
  const stolen = new Client(); stolen.cookie = oldCookie;
  check('Guest session revoked when account is created', (await stolen.ok('me')).profile === null && (await upgraded.ok('me')).profile.isAccount);
  check('Registration preserves guest history identity',(await upgraded.ok('me')).profile.id===beforeUpgrade);
  const owner=new Client(true);owner.email=ownerEmail;
  const ownerBody={name:'David',email:owner.email,password:owner.password,setupCode};
  const reservedOwner=await owner.call('auth/sign-up/email','POST',{name:'David',email:owner.email,password:owner.password});
  check('Owner email requires private activation',reservedOwner.status===403);
  check('Reserved owner receives an actionable activation code',reservedOwner.data.code==='OWNER_ACTIVATION_REQUIRED');
  check('Wrong activation secret denied',(await owner.call('auth/activate-owner','POST',{...ownerBody,setupCode:'wrong'})).status===403);
  check('Activation rejects non-owner email',(await owner.call('auth/activate-owner','POST',{...ownerBody,email:'impostor@example.test'})).status===403);
  await owner.ok('auth/activate-owner','POST',ownerBody);
  const ownerMe=await owner.ok('me');
  check('Owner retains legacy profile and sets',ownerMe.profile.role==='owner'&&ownerMe.profile.id===legacyId&&(await owner.ok('sets')).sets[0].id==='legacy-set');
  check('Owner activation is one use',(await owner.call('auth/activate-owner','POST',ownerBody)).status===409);
  check('Guest cannot access administration',(await i.call('admin/overview')).status===401);
  check('Player cannot access administration',(await h.call('admin/overview')).status===403);
  const adminUsers=await owner.ok('admin/users');
  check('Admin sees users without authentication secrets',adminUsers.users.some(u=>u.email===h.email)&&!JSON.stringify(adminUsers).match(/password|session_token|token_hash|recoveryCode/));
  await h.ok('sets','POST',{name:'Manga',items:['Naruto','Luffy','Ichigo']});
  const setid = (await h.ok('sets')).sets[0].id;
  check('Another account cannot edit a set', (await other.call('sets','POST',{id:setid,name:'Hijack',items:['Foo','Bar']})).status === 404);
  check('Another account cannot see saved sets', (await other.ok('sets')).sets.length === 0);
  const settings = {pack:'classique',roundCount:1,duration:120,mode:'players',themeMode:'pack'};
  const code = (await h.ok('rooms','POST',settings)).code, path = 'rooms/' + code;
  check('Nonmembers cannot inspect room', (await x.call(path)).status === 403);
  await i.ok(path+'/join','POST');
  check('Only host can start', (await i.call(path+'/start','POST')).status === 403);
  check('Three players required', (await h.call(path+'/start','POST')).status === 409);
  await l.ok(path+'/join','POST'); await h.ok(path+'/start','POST');
  const room = await h.ok(path), him = room.me, ids = room.members.map(m => m.id), im = (await i.ok(path)).me, lm = (await l.ok(path)).me;
  check('Starting freezes roster', room.roster.length === 3 && room.targets.length === 3);
  check('Late entrants rejected', (await x.call(path+'/join','POST')).status === 409);
  check('Self vote rejected', (await h.call(path+'/vote','POST',{round:1,rankings:Object.fromEntries(ids.map(id=>[id,5]))})).status === 400);
  check('Incomplete vote rejected', (await h.call(path+'/vote','POST',{round:1,rankings:{[im]:5}})).status === 400);
  const ballot = {round:1,rankings:{[im]:5,[lm]:4}};
  let statuses = await Promise.all([h.call(path+'/vote','POST',ballot),h.call(path+'/vote','POST',ballot)]);
  check('Concurrent duplicate ballots commit once', statuses.map(r=>r.status).sort().join() === '200,409');
  const secret = await i.ok(path);
  check('Feedback forbidden before reveal',(await i.call(path+'/feedback','POST',{round:1,rating:1})).status===409);
  check('Rematch forbidden during game',(await i.call(path+'/rematch','POST')).status===409);
  check('Other rankings remain secret before reveal', secret.myBallot === null && secret.results.length === 0 && secret.finalResults.length === 0 && secret.revealedBallots.length === 0);
  check('Admin cannot view active ballots',(await owner.ok('admin/rooms/'+code)).ballots.length===0);
  check('Voter can recover own ballot', JSON.stringify((await h.ok(path)).myBallot) === JSON.stringify(ballot.rankings));
  await i.ok(path+'/report','POST',{round:1,reason:'inapproprie'});
  check('Reports reach host only', (await h.ok(path)).reportCount === 1 && (await l.ok(path)).reportCount === 0);
  await i.ok(path+'/vote','POST',{round:1,rankings:{[him]:4,[lm]:0}});
  await l.ok(path+'/vote','POST',{round:1,rankings:{},abstain:true});
  const reveal = await h.ok(path), byid = Object.fromEntries(reveal.results.map(r=>[r.id,r]));
  check('All submitted reveals round', reveal.status === 'reveal');
  check('Individual ballots only revealed afterwards',reveal.revealedBallots.length===3&&reveal.revealedBallots.some(b=>b.memberId===him&&b.rankings[im]===5));
  check('Means correct and abstention ignored', byid[him].average === 4 && byid[im].average === 5 && byid[lm].average === 2 && byid[lm].votes === 2);
  check('Nonmember cannot rate questions',(await x.call(path+'/feedback','POST',{round:1,rating:1})).status===403);
  check('Feedback rejects invalid value',(await i.call(path+'/feedback','POST',{round:1,rating:5})).status===400);
  await i.ok(path+'/feedback','POST',{round:1,rating:1});
  await i.ok(path+'/feedback','POST',{round:1,rating:-1});
  check('Feedback changes without adding a second vote',(await inspect('SELECT rating FROM question_feedback WHERE room_code=? AND member_id=?',code,im)).length===1&&(await i.ok(path)).myQuestionRating===-1);
  check('Feedback remains private to voter',(await h.ok(path)).myQuestionRating===null);
  await i.ok(path+'/feedback','POST',{round:1,rating:null});
  check('Feedback can be withdrawn',(await inspect('SELECT rating FROM question_feedback WHERE room_code=?',code)).length===0);
  await h.ok(path+'/feedback','POST',{round:1,rating:1});
  check('Only host can advance' , (await i.call(path+'/next','POST',{round:1})).status === 403);
  statuses = await Promise.all([h.call(path+'/next','POST',{round:1}),h.call(path+'/next','POST',{round:1})]);
  check('Concurrent next advances once', statuses.map(r=>r.status).sort().join() === '200,409');
  check('Final state persisted', (await h.ok(path)).status === 'finished');
  check('Admin can inspect completed game',(await owner.ok('admin/rooms/'+code)).ballots.length===3);
  const stats = await h.ok('stats');
  check('Account stats counted once', stats.games === 1 && stats.roundVotes === 1 && stats.average === 4 && stats.received[4] === 1);
  check('Question memories use real votes and question text',stats.memories.length===1&&stats.memories[0].question===room.question&&stats.memories[0].average===4&&stats.memories[0].votes===1&&stats.memories[0].sCount===0);
  check('Badges have explicit participation thresholds',stats.milestones.find(b=>b.id==='first').earned&&!stats.milestones.find(b=>b.id==='regular').earned);
  check('Feedback export contains only own opinion',(await h.ok('account/export')).questionFeedback.length===1);
  check('Player cannot access feedback dashboard',(await h.call('admin/feedback')).status===403);
  const feedbackAdmin=await owner.ok('admin/feedback');
  check('Owner sees catalogue feedback totals',feedbackAdmin.feedback.some(f=>f.question===room.question&&f.likes===1&&f.dislikes===0&&f.rooms===1));
  check('Nonmember cannot trigger rematch',(await x.call(path+'/rematch','POST')).status===403);
  const repeated=await Promise.all([h.ok(path+'/rematch','POST'),i.ok(path+'/rematch','POST')]);
  check('Simultaneous rematches converge on one new lobby',repeated[0].code===repeated[1].code&&repeated[0].code!==code);
  const rp='rooms/'+repeated[0].code,rs=await h.ok(rp);
  check('Rematch copies settings but not votes or identities',rs.status==='lobby'&&rs.pack===settings.pack&&rs.duration===120&&rs.roundCount===1&&rs.members.length===2&&rs.submitted.length===0&&rs.roster.length===0);
  check('Rematch creation leaves no orphan room',(await inspect('SELECT code FROM rooms')).length===2);
  await l.ok(path+'/rematch','POST');
  check('Rematch joins preserve existing profiles',(await l.ok(rp)).members.length===3&&(await inspect('SELECT COUNT(*) AS n FROM profiles WHERE name IN (?,?,?)','Hote','Isaac','Liam'))[0].n===3);
  for(const c of [h,i,l])await c.ok(rp+'/leave','POST');
  const product=(await owner.ok('admin/overview')).product;
  check('Product counters distinguish rematch intent from play',product.finishedGames===1&&product.rematchLobbies===1&&product.rematchesStarted===0);
  check('Rematch preserves original completed history',(await h.ok(path)).status==='finished'&&(await h.ok('stats')).games===1);
  check('Unrelated account stats empty' , (await other.ok('stats')).games === 0);
  check('Private export contains own votes', (await h.ok('account/export')).votes.length === 1);
  const p2 = 'rooms/' + (await h.ok('rooms','POST',{...settings,mode:'set',setName:'Manga',items:['Naruto','Luffy'],themeMode:'box'})).code;
  await i.ok(p2+'/join','POST'); await l.ok(p2+'/join','POST'); await i.ok(p2+'/propose','POST',{question:'Qui gagnerait ce combat ?'}); await h.ok(p2+'/start','POST');
  let s = await h.ok(p2);
  check('Box waits for host and preserves proposals', s.status === 'choosing' && s.proposals.length === 1);
  check('Only host selects question', (await i.call(p2+'/choose','POST',{question:'Question détournée ?',round:1})).status === 403);
  await h.ok(p2+'/choose','POST',{question:s.proposals[0].text,round:1}); s = await h.ok(p2);
  check('Set elements independent of voters', s.targets.length === 2 && s.roster.length === 3 && s.question === 'Qui gagnerait ce combat ?');
  await h.ok(p2+'/vote','POST',{round:1,rankings:Object.fromEntries(s.targets.map(t=>[t.id,5]))});
  await h.ok(p2+'/skip','POST',{round:1}); s = await h.ok(p2);
  check('Skipped questions cannot be rated',(await h.call(p2+'/feedback','POST',{round:1,rating:1})).status===409);
  check('Skip discards results', s.skipped && s.results.length === 0);
  await h.ok(p2+'/next','POST',{round:1});
  const setRematch=await h.ok(p2+'/rematch','POST'),setReplay=await h.ok('rooms/'+setRematch.code);
  check('Set rematch preserves names and theme mode with new target IDs',setReplay.mode==='set'&&setReplay.themeMode==='box'&&setReplay.setName==='Manga'&&setReplay.targets.map(t=>t.name).join()==='Naruto,Luffy'&&!setReplay.targets.some(t=>s.targets.some(old=>old.id===t.id))&&setReplay.proposals.length===0);
  await h.ok('rooms/'+setRematch.code+'/leave','POST');
  check('Skipped votes excluded from stats' , (await h.ok('stats')).roundVotes === 1);
  const ownerStats=(await owner.ok('admin/users/'+(await h.ok('me')).profile.id)).stats;
  check('Player and administrator use identical statistics scope',ownerStats.submittedVotes===1&&ownerStats.completedGames===(await h.ok('stats')).games);
  check('Skipped ballots not exposed in gallery',s.revealedBallots.length===0);
  check('History includes a meaningful question title',(await h.ok('stats')).history.some(g=>g.title&&g.code===code));
  const p3 = 'rooms/' + (await h.ok('rooms','POST',settings)).code;
  await i.ok(p3+'/join','POST'); await l.ok(p3+'/join','POST'); await h.ok(p3+'/leave','POST'); s = await i.ok(p3);
  check('Host departure transfers control', s.hostId === s.me);
  await h.ok(p3+'/join','POST'); await i.ok(p3+'/start','POST'); s = await h.ok(p3);
  check('Reconnect retains identity', s.roster.includes(s.me));
  await fixture([`UPDATE rooms SET deadline=0 WHERE code='${s.code}'`]);
  check('Expired vote rejected server-side', (await h.call(p3+'/vote','POST',{round:1,rankings:{},abstain:true})).status === 409);
  await i.ok(p3+'/pulse','POST');
  check('Heartbeat reveals expired round', (await i.ok(p3)).status === 'reveal');
  await i.ok(p3+'/next','POST',{round:1});
  const otherId=(await other.ok('me')).profile.id;
  check('Suspension requires owner password',(await owner.call('admin/users/'+otherId+'/status','POST',{suspended:true,password:'wrong'})).status===403);
  await owner.ok('admin/users/'+otherId+'/status','POST',{suspended:true,password:owner.password});
  check('Suspension revokes sessions',!(await other.ok('me')).signedIn);
  check('Suspended account cannot reconnect',(await other.call('auth/sign-in/email','POST',{email:other.email,password:other.password})).status!==200);
  await owner.ok('admin/users/'+otherId+'/status','POST',{suspended:false,password:owner.password});await other.login();
  check('Reactivation restores access',(await other.ok('me')).signedIn);
  check('Owner cannot be suspended',(await owner.call('admin/users/'+legacyId+'/status','POST',{suspended:true,password:owner.password})).status===403);
  check('Owner account cannot be removed accidentally',(await owner.call('account','DELETE',{confirmation:'SUPPRIMER',password:owner.password})).status===409);
  check('Invalid delete confirmation rejected', (await h.call('account','DELETE',{confirmation:'non'})).status === 400);
  check('Account deletion requires current password',(await h.call('account','DELETE',{confirmation:'SUPPRIMER',password:'wrong'})).status===403);
  await h.ok('account','DELETE',{confirmation:'SUPPRIMER',password:h.password});
  check('Account deletion removes profile and sets', (await h.ok('me')).profile === null && (await h.call('sets')).status === 401);
  check('Account deletion also removes question feedback',(await inspect('SELECT * FROM question_feedback WHERE member_id=?',him)).length===0);
  check('Account deletion removes auth identity',(await inspect('SELECT id FROM auth_user WHERE email=?',h.email)).length===0);
  const remaining = await i.ok(path);
  check('Deleted participant name scrubbed', remaining.targets.some(t=>t.name==='Joueur supprimé') && remaining.targets.every(t=>t.name!=='Hote'));
  check('Collective results remain accessible', remaining.status === 'finished');

  for(const value of [null,[],3,'bad'])check('Invalid JSON shape returns 400: '+JSON.stringify(value),(await new Client().call('auth/sign-in/email','POST',value)).status===400);
  check('Game API rejects null JSON',(await new Client().call('profile','POST',null)).status===400);
  const sharedPlayers=[];
  for(let n=0;n<12;n++){const c=new Client();c.ip='198.51.100.21';await c.register('Reseau '+n);sharedPlayers.push(c);}
  check('Twelve accounts can register on the same WiFi',sharedPlayers.length===12);
  const target=new Client();await target.register('Disponibilite');await target.ok('auth/sign-out','POST');
  for(let n=0;n<41;n++){const attacker=new Client();attacker.ip='203.0.113.'+(n+1);await attacker.call('auth/sign-in/email','POST',{email:target.email,password:'incorrect'});}
  check('Distributed failures do not block a legitimate login',(await target.call('auth/sign-in/email','POST',{email:target.email,password:target.password})).status===200);
  const limited=new Client();for(let n=0;n<10;n++)await limited.call('auth/sign-in/email','POST',{email:'inconnu@example.test',password:'incorrect'});
  check('IP and account pair still throttles brute force',(await limited.call('auth/sign-in/email','POST',{email:'inconnu@example.test',password:'incorrect'})).status===429);
  const guests=[];for(let n=0;n<12;n++){const c=new Client();c.ip='198.51.100.22';await c.ok('profile','POST',{name:'Invite '+n});guests.push(c);}
  const guestHost=guests[0],gp='rooms/'+(await guestHost.ok('rooms','POST',settings)).code;
  for(const c of guests.slice(1))await c.ok(gp+'/join','POST');
  await guestHost.ok(gp+'/start','POST');const gs=await guestHost.ok(gp);
  check('Twelve guests play without creating accounts',gs.roster.length===12&&(await guestHost.ok('me')).signedIn===false);
  const rankedId=gs.targets.find(t=>t.id!==gs.me).id;
  const partial=Object.fromEntries(gs.targets.filter(t=>t.id!==gs.me).map(t=>[t.id,t.id===rankedId?5:null]));
  await guestHost.ok(gp+'/vote','POST',{round:1,rankings:partial});
  check('Partial vote persists explicit omissions',(await guestHost.ok(gp)).myBallot[rankedId]===5&&Object.values((await guestHost.ok(gp)).myBallot).includes(null));
  for(const c of guests.slice(1))await c.ok(gp+'/vote','POST',{round:1,rankings:{},abstain:true});
  const gr=await guestHost.ok(gp);check('Unranked names never receive E',gr.results.length===1&&gr.results[0].average===5&&gr.results[0].votes===1);
  await guestHost.ok(gp+'/next','POST',{round:1});
  const guestProfileId=(await guestHost.ok('me')).profile.id;await guestHost.register('Invite compte');
  const migrated=await guestHost.ok('stats');
  check('Unranked names do not create fake memories',migrated.memories.length===0&&migrated.received[0]===0);
  check('Optional account after game retains guest history',migrated.games===1&&migrated.roundVotes===1&&(await guestHost.ok('me')).profile.id===guestProfileId);

  await socialCases({Client,check,inspect,owner});
  await playerTabCases({Client,check});
  console.log(JSON.stringify({passed,test:'Built Worker + isolated D1 integration'}));
} finally { await mf.dispose(); }
