const { launchChrome } = require('./qa-browser.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  fs.mkdirSync('.qa', { recursive: true });
  const browser=await launchChrome();
  try {
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>window.__squish);
    const read=()=>page.evaluate(()=>window.__squish.state);
    const report=[];
    for(const id of ['peach','bunny','pudding','orange','bear']){
      await page.click(`[data-toy=${id}]`);await page.waitForTimeout(600);
      const clean=await read();assert.equal(clean.toy,id);assert.equal(clean.cracks,0);assert.equal(clean.fields,0);
      await page.screenshot({path:`.qa/${id}.png`});
      await page.mouse.move(755,485);await page.mouse.down();await page.waitForTimeout(1300);
      const pressed=await read();assert(pressed.down&&pressed.maxIndent>.07&&pressed.cracks>0,JSON.stringify(pressed));
      await page.screenshot({path:`.qa/${id}-pressed.png`});
      await page.mouse.move(790,510,{steps:3});await page.mouse.up();await page.waitForTimeout(4200);
      const released=await read();assert(released.maxIndent<.02,JSON.stringify(released));assert(released.cracks>=pressed.cracks);
      await page.click('#reset');await page.waitForTimeout(550);
      const reset=await read();assert.equal(reset.cracks,0);assert.equal(reset.shardVertices,0);assert.equal(reset.geometries,clean.geometries);
      report.push({id,profile:clean.profile,fractures:pressed.cracks,indent:pressed.maxIndent,geometries:clean.geometries,textures:clean.textures});
      console.log('PASS '+id);
    }
    await page.click('[data-toy=peach]');await page.waitForTimeout(600);
    const back=await read();assert.equal(back.geometries,report[0].geometries);assert.equal(back.textures,report[0].textures);
    await page.click('#sound');assert.equal((await read()).sound,false);
    await page.click('[data-toy=bunny]');assert.equal((await read()).sound,false);
    await page.setViewportSize({width:1440,height:810});await page.screenshot({path:'.qa/widescreen.png'});
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.qa/mobile.png'});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight),false);
    await page.click('[data-toy=orange]');assert.equal((await read()).toy,'orange');
    const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await mobile.goto('http://127.0.0.1:5173');await mobile.waitForFunction(()=>window.__squish);
    const cdp=await mobile.context().newCDPSession(mobile);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:195,y:400}]});await mobile.waitForTimeout(600);
    assert((await mobile.evaluate(()=>window.__squish.state)).down,'Touch failed');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.equal((await mobile.evaluate(()=>window.__squish.state)).down,false);
    console.log(JSON.stringify({report,errors},null,2));assert.equal(errors.length,0);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
