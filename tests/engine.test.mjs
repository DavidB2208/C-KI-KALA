import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const src=await readFile(new URL('../lib/game-engine.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {validateBallot,aggregate,shuffle}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const targets=[{id:'a',name:'Ariel',avatar:1},{id:'b',name:'Isaac',avatar:2},{id:'c',name:'David',avatar:3}];
test('A participant ranks themselves and the others, with empty tiers allowed',()=>assert.doesNotThrow(()=>validateBallot({a:2,b:5,c:5},targets,'a','players',false)));
test('Missing targets, extra targets and non-integer ranks fail',()=>{
 for(const ballot of [{b:5,c:5},{a:4,b:4},{a:3,b:3,c:4,outsider:2},{a:3.1,b:3,c:4},{a:6,b:3,c:4},{a:-1,b:3,c:4}])assert.throws(()=>validateBallot(ballot,targets,'a','players',false));
});
test('Set items are independent from participating player identities',()=>assert.doesNotThrow(()=>validateBallot({a:1,b:2,c:3},targets,'a','set',false)));
test('Abstention must be empty and does not turn into E votes',()=>{assert.doesNotThrow(()=>validateBallot({},targets,'a','players',true));assert.throws(()=>validateBallot({b:5},targets,'a','players',true));assert.deepEqual(aggregate(targets,[{rankings:'{}',abstained:1}]),[]);});
test('Aggregation averages only received votes and preserves ties',()=>{
 const result=aggregate(targets,[{rankings:'{"a":5,"b":1}',abstained:0},{rankings:'{"a":1,"b":5}',abstained:0},{rankings:'{}',abstained:1}]);
 assert.equal(result.length,2);assert.deepEqual(result.map(r=>r.average),[3,3]);assert.equal(result[0].votes,2);assert.equal(result[0].sCount,1);assert.equal(result[0].distribution[0],0);
});
test('Question shuffling never changes or duplicates the source bank',()=>{const original=['one','two','three','four'];const shuffled=shuffle(original);assert.deepEqual([...shuffled].sort(),[...original].sort());assert.deepEqual(original,['one','two','three','four']);});

test('Explicit omissions are ignored, while accidental missing targets remain invalid',()=>{
 assert.doesNotThrow(()=>validateBallot({a:null,b:5,c:null},targets,'a','players',false));
 assert.throws(()=>validateBallot({a:null,b:null,c:null},targets,'a','players',false));
 const result=aggregate(targets,[{rankings:'{"b":5,"c":null}',abstained:0},{rankings:'{"b":null,"c":3}',abstained:0}]);
 assert.equal(result.find(r=>r.id==='b').average,5);assert.equal(result.find(r=>r.id==='c').votes,1);assert.equal(result.find(r=>r.id==='c').average,3);
});
test('A self ranking contributes one ordinary score to the aggregate',()=>{
 const result=aggregate(targets,[{rankings:'{"a":4,"b":2,"c":null}',abstained:0},{rankings:'{"a":2,"b":null,"c":5}',abstained:0}]);
 assert.equal(result.find(r=>r.id==='a').average,3);
 assert.equal(result.find(r=>r.id==='a').votes,2);
});
