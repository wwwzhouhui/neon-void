import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {}), args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport:{width:1280,height:720}, deviceScaleFactor:1});
const errors = [], external = [];
page.on('pageerror', e=>errors.push(e.message));
page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:8080/') && !r.url().startsWith('data:')) external.push(r.url());});
const origin='http://127.0.0.1:8080';
mkdirSync('artifacts',{recursive:true});
try {
  await page.goto(origin); await page.waitForFunction(()=>window.__game);
  await page.click('#deploy'); await page.waitForFunction(()=>__game.game.state==='playing');
  await page.keyboard.press('e');
  assert.equal(await page.evaluate(()=>__game.game.dashUses),1);
  await page.keyboard.press('e');
  assert.equal(await page.evaluate(()=>__game.game.dashUses),1);
  await page.keyboard.press('p'); await page.waitForFunction(()=>__game.game.state==='paused');
  const frozen=await page.evaluate(()=>__game.game.now);
  await page.waitForTimeout(350);
  assert.equal(await page.evaluate(()=>__game.game.now),frozen);
  await page.locator('#sensitivity').fill('1.4');
  await page.locator('#reduced-motion').check();
  await page.click('#resume'); await page.waitForFunction(()=>__game.game.state==='playing');
  await page.keyboard.press('2');assert.equal(await page.evaluate(()=>__game.player.state.currentWeapon),'shotgun');
  await page.keyboard.press('1');
  await page.evaluate(()=>__game.player.state.weapons.rifle.mag=1);
  await page.keyboard.press('r'); await page.waitForTimeout(150);
  assert.match(await page.locator('#ammo-mag').innerText(),/%/);
  await page.waitForFunction(()=>!__game.player.state.reloading);
  assert.equal(await page.evaluate(()=>__game.player.state.weapons.rifle.mag),30);
  const chain = await page.evaluate(()=>{
    const g=__game;g.enemyManager.clearAll();g.game.score=0;
    for(let i=0;i<4;i++){
      const e=g.enemyManager.spawnNow('drone',0,-5);
      const mesh=g.enemyManager.hitMeshes.find(m=>m.userData.enemyRef===e);
      g.enemyManager.damageEnemy(mesh,999,g.game.now);
    }
    return {count:g.game.chain.count,score:g.game.score};
  });
  assert.equal(chain.count,4);assert.equal(chain.score,500);
  await page.evaluate(()=>{__game.player.state.alive=false;__game.player.state.hp=0;});
  await page.waitForFunction(()=>__game.game.state==='over');
  await page.click('#redeploy');await page.waitForFunction(()=>__game.game.state==='playing');
  assert.equal(await page.evaluate(()=>__game.game.score),0);
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await page.waitForFunction(()=>__game.game.state==='paused');
} catch(e) {
  // Assertions below are also reported by CI; preserve diagnostic screenshot on failure.
  await page.screenshot({path:'artifacts/failure.png'});throw e;
} finally { /* screenshots continue below after the interaction checks */ }
const shots=[['1-start','start'],['2-play','play'],['3-action','action'],['4-end','end']];
const manifest=[];
for(const [file,shot] of shots){
  await page.goto(`${origin}/?shot=${shot}&seed=1`);await page.waitForFunction(()=>window.__shotReady);
  await page.evaluate(()=>document.fonts.ready);
  const path=`screenshots/${file}.jpg`;
  await page.screenshot({path,type:'jpeg',quality:86});
  assert.ok(statSync(path).size<=262144);
  manifest.push({path,width:1280,height:720,bytes:statSync(path).size,query:`?shot=${shot}&seed=1`,method:'Chromium WebGL render; deterministic in-game screenshot fixture'});
}
await page.setViewportSize({width:768,height:480});
await page.goto(origin+'/?shot=start&seed=1');await page.waitForFunction(()=>window.__shotReady);
const button=await page.locator('#deploy').boundingBox();assert.ok(button && button.y>=0 && button.y+button.height<=480);
await page.screenshot({path:'artifacts/title-768x480.jpg',type:'jpeg',quality:86});
assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
writeFileSync('artifacts/browser-validation.json',JSON.stringify({status:'passed',checks:['start/resume/restart buttons','dash and cooldown','pause freezes simulation','sensitivity/reduced motion controls','weapon switching','reload completion/progress','real enemy kill callbacks and chain scoring','death/restart','blur pauses','four real WebGL fixture renders','768x480 start control in viewport','no external requests','no page errors'],screenshots:manifest},null,2));
await browser.close();console.log('Browser gameplay checks and four screenshots passed.');
