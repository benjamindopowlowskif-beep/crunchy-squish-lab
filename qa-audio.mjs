import {renderTexture,SOUND_PROFILES} from './src/audio.js';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/xiaoxiami/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const metrics={};
for(const id of Object.keys(SOUND_PROFILES)){
  let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const data=renderTexture(id,'crack',.7,48000,random);
  let energy=0,difference=0,peak=0;
  for(let i=0;i<data.length;i++){assert(Number.isFinite(data[i]));energy+=data[i]**2;peak=Math.max(peak,Math.abs(data[i]));if(i)difference+=(data[i]-data[i-1])**2;}
  const rms=Math.sqrt(energy/data.length);
  assert(rms>.004 && peak<.8,id+' level out of range');
  metrics[id]={duration:data.length/48000,rms,peak,brightness:Math.sqrt(difference/energy)};
}
assert(metrics.peach.brightness>metrics.pudding.brightness*3,'Crisp/muffled spectra too similar');
assert(metrics.bunny.duration<.28 && metrics.bunny.rms<.05,'Bunny should be short and quiet');
console.log(JSON.stringify(metrics,null,2));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>window.__squish);
  const state=()=>page.evaluate(()=>window.__squish.state.audio);
  for(const id of Object.keys(SOUND_PROFILES)){
    await page.click(`[data-toy=${id}]`);await page.waitForTimeout(550);
    const before=await state();assert.equal(before.toy,id);
    await page.mouse.move(740,485);await page.mouse.down();await page.waitForTimeout(950);
    for(const x of [750,770,745]){await page.mouse.move(x,500);await page.waitForTimeout(310);}
    await page.mouse.up();await page.waitForTimeout(80);
    const after=await state();assert.equal(after.context,'running');
    for(const kind of ['crack','knead','release'])assert(after.counts[kind]>before.counts[kind],id+' missing '+kind);
    assert.equal(after.lastEvent.toy,id);console.log('PASS audio '+id+' '+after.texture);
  }
  await page.click('#sound');const muted=await state();assert.equal(muted.enabled,false);
  await page.mouse.move(740,480);await page.mouse.down();await page.waitForTimeout(550);await page.mouse.up();
  assert.deepEqual((await state()).counts,muted.counts);
  await page.click('[data-toy=peach]');assert.equal((await state()).enabled,false);
  await page.click('#sound');assert.equal((await state()).enabled,true);
  assert.deepEqual(errors,[]);console.log('PASS mute, profile switching, browser errors');
}finally{await browser.close();}
