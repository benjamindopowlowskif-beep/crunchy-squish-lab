const {launchChrome}=require('./qa-browser.cjs');
const {spawn,spawnSync}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
  const launcher=spawn('cmd.exe',['/d','/c','启动捏捏.cmd'],{cwd:__dirname,env:{...process.env,BROWSER:'none'},windowsHide:true});
  let browser;
  try{
    const url=await new Promise((resolve,reject)=>{
      let output='';const timer=setTimeout(()=>reject(new Error('Launcher timeout: '+output)),30000);
      launcher.stdout.on('data',chunk=>{output+=chunk;const match=output.replace(/\x1b\[[0-9;]*m/g,'').match(/http:\/\/127\.0\.0\.1:\d+\//);if(match){clearTimeout(timer);resolve(match[0]);}});
      launcher.stderr.on('data',chunk=>{output+=chunk;});
      launcher.on('error',error=>{clearTimeout(timer);reject(error);});
      launcher.on('exit',code=>{clearTimeout(timer);reject(new Error(`Launcher exited ${code}: ${output}`));});
    });
    browser=await launchChrome();
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    for(const file of ['index.html','dist/index.html']){
      await page.goto(pathToFileURL(path.join(__dirname,file)).href);
      await page.locator('#launch-help').waitFor();
      assert.equal(await page.locator('#app').isVisible(),false);
      assert.equal(await page.locator('#launch-help').evaluate(e=>getComputedStyle(e).maxWidth),'660px');
    }
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    for(const address of [url,'http://127.0.0.1:5173/']){
      await page.goto(address);
      await page.waitForFunction(()=>!!window.__squish);
      assert.equal(await page.locator('.toy-option').count(),5);
      assert.equal(await page.locator('#scene').evaluate(e=>getComputedStyle(e).position),'absolute');
      assert.equal(await page.locator('#launch-help').count(),0);
    }
    await page.screenshot({path:'.qa/entry-fixed.png'});
    assert.deepEqual(errors,[]);
    console.log('PASS launcher starts Vite; source and built file:// show guide; dev and preview HTTP load styled five-toy game without JS errors.');
  }finally{
    if(browser)await browser.close();
    // Only stop the helper process tree created by this test, never the user's server.
    if(launcher.pid)spawnSync('taskkill',['/PID',String(launcher.pid),'/T','/F'],{windowsHide:true});
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
