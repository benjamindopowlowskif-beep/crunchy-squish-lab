const { launchChrome } = require('./qa-browser.cjs');
const assert = require('node:assert/strict');
(async () => {
  const browser = await launchChrome();
  try {
    const page = await browser.newPage({viewport:{width:1440,height:900}});
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:5173/');
    const state=()=>page.evaluate(()=>{const a=document.querySelector('#background-music');return {paused:a.paused,time:a.currentTime,volume:a.volume,loop:a.loop,pressed:document.querySelector('#music').getAttribute('aria-pressed')};});
    assert.equal((await state()).pressed,'true');
    await page.click('#reset');
    await page.waitForFunction(()=>document.querySelector('#background-music').currentTime>.2);
    assert.equal((await state()).pressed,'true');
    assert.equal((await state()).loop,true);
    assert.equal((await state()).volume,.55);
    await page.click('#sound');
    assert.equal((await state()).paused,false);
    await page.click('[data-toy="bear"]'); await page.click('#reset');
    assert.equal((await state()).paused,false);
    assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'false');
    await page.evaluate(()=>{const a=document.querySelector('#background-music');a.currentTime=a.duration-.15;});
    await page.waitForFunction(()=>document.querySelector('#background-music').currentTime<2);
    await page.click('#music');
    assert.equal((await state()).paused,true);
    await page.click('#sound');
    assert.equal((await state()).paused,true);
    await page.click('#music');
    await page.waitForFunction(()=>!document.querySelector('#background-music').paused);
    await page.click('#music');
    await page.setViewportSize({width:375,height:812});
    const box=await page.locator('.controls').boundingBox();
    assert.ok(box.x>=0 && box.x+box.width<=375);
    assert.deepEqual(errors,[]);
    console.log('PASS: default enabled, playback, loop wrap, pause/resume, independent effects, reset/switch persistence, mobile fit; zero page errors.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
