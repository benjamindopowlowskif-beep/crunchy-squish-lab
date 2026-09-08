const {chromium}=require('C:/Users/xiaoxiami/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
  for(const policy of ['no-user-gesture-required','document-user-activation-required']){
    const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:[`--autoplay-policy=${policy}`]});
    try {
      const page=await browser.newPage();
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto('http://127.0.0.1:5173/');
      assert.equal(await page.locator('#music').getAttribute('aria-pressed'),'true');
      if(policy==='document-user-activation-required'){
        await page.waitForFunction(()=>document.querySelector('#music-text').textContent==='音乐待播放');
        await page.click('#music');
        await page.click('#reset');
        assert.equal(await page.locator('#background-music').evaluate(a=>a.paused),true);
        await page.click('#music');
      }
      await page.waitForFunction(()=>document.querySelector('#background-music').currentTime>.1);
      assert.deepEqual(errors,[]);
      console.log(`PASS ${policy}`);
      if(policy==='document-user-activation-required'){
        const fresh=await browser.newPage();
        await fresh.goto('http://127.0.0.1:5173/');
        await fresh.waitForFunction(()=>document.querySelector('#music-text').textContent==='音乐待播放');
        await fresh.click('#reset');
        await fresh.waitForFunction(()=>document.querySelector('#background-music').currentTime>.1);
        console.log('PASS first gesture unlock');
      }
    } finally {await browser.close();}
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
