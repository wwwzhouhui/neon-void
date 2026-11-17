// Supplemental reproducibility evidence. This is NOT a make.fun agent transcript.
import {readdirSync,readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
const hash=b=>createHash('sha256').update(b).digest('hex');
function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]).sort();}
const files=[...walk('game'),...walk('screenshots'),'main.ts','vendor/makefun-game.ts','shots.json'].map(path=>{const b=readFileSync(path);return {path,bytes:b.length,sha256:hash(b)};});
const browser=existsSync('artifacts/browser-validation.json')?JSON.parse(readFileSync('artifacts/browser-validation.json','utf8')):null;
const currentCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const browserMatches=browser?.commit===currentCommit;
const exportDir=process.env.NEON_TRANSCRIPT_DIR;
const exports=exportDir?walk(exportDir).map(path=>{const b=readFileSync(path);return {name:path.slice(exportDir.length+1),bytes:b.length,sha256:hash(b)};}):[];
const evidence={schema:'neon-void/build-evidence/1',commit:currentCommit,node:process.version,files,browserValidation:browserMatches?browser.status:'not_run_or_stale',screenshots:browserMatches?browser.screenshots:'not_refreshed_in_this_run',originalAgentRecords:{status:exports.length?'provided_unverified':'missing',files:exports,providerUsage:'not_available_to_this_script',officialBundle:'not_created',note:'Hashes are supplemental evidence only. Supply unchanged native session exports with real provider usage and run official kit checks; this report cannot prove prize eligibility.'},competitionSubmission:'not_performed'};
mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/build-evidence.json',JSON.stringify(evidence,null,2)+'\n');
console.log(`Evidence written: ${files.length} files; browser=${evidence.browserValidation}; native records=${evidence.originalAgentRecords.status}`);
