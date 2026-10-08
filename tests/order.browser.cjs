// Optional real-browser regression checks. Every API request is intercepted;
// this never submits production orders. Requires an installed Playwright + Chromium.
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const API='https://ak-ai-shop-orders-api.vercel.app/api/order';
const receipt={ok:true,receiptId:'VR-BROWSER-TEST',receivedAt:'2026-10-08T07:00:00.000Z'};
const server=http.createServer((req,res)=>{
  const filename=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!filename.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(filename,(error,body)=>{
    if(error){res.writeHead(404).end();return;}
    const ext=path.extname(filename);
    res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'})[ext]||'application/octet-stream');res.end(body);
  });
});
async function fill(page){
  await page.locator('[name=name]').fill('KIỂM THỬ CỤC BỘ');
  await page.locator('[name=phone]').fill('0000000000');
  await page.locator('[name=product]').selectOption({label:'AK Video Director Skill'});
  await page.locator('[name=package]').selectOption({label:'Nhận demo / tư vấn trước'});
  await page.locator('[name=confirm]').check();
}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined});
  let passed=0;
  try{
    async function scenario(name,fn){
      const context=await browser.newContext();const errors=[];
      context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
      // Block every external host unless the scenario explicitly fulfills API.
      await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
      try{await fn(context);assert.deepEqual(errors,[]);passed++;console.log('PASS '+name);}
      finally{await context.close();}
    }
    await scenario('valid receipt and same request after navigation produces one POST',async context=>{
      let calls=0;await context.route(API,route=>{calls++;return route.fulfill({json:receipt});});
      const page=await context.newPage();await page.goto(base+'/order.html');await fill(page);
      await page.locator('button[type=submit]').click();await page.waitForURL('**/order-confirmed.html?code=*');
      assert.match(await page.locator('#orderSummary').innerText(),/VR-BROWSER-TEST/);
      assert.match(await page.locator('#serverNote').innerText(),/chưa xác nhận xử lý/);
      const first=page.url();await page.goto(base+'/order.html');await fill(page);await page.locator('button[type=submit]').click();await page.waitForURL(first);assert.equal(calls,1);
    });
    await scenario('two tabs with the same payload share one POST using Web Locks',async context=>{
      let calls=0;await context.route(API,route=>{calls++;return route.fulfill({json:receipt});});
      const a=await context.newPage(),b=await context.newPage();
      await Promise.all([a.goto(base+'/order.html'),b.goto(base+'/order.html')]);await Promise.all([fill(a),fill(b)]);
      await Promise.all([a.locator('button[type=submit]').click(),b.locator('button[type=submit]').click()]);
      await Promise.all([a.waitForURL('**/order-confirmed.html?code=*'),b.waitForURL('**/order-confirmed.html?code=*')]);assert.equal(calls,1);assert.equal(a.url(),b.url());
    });
    await scenario('offline request keeps uncertainty and the original code on reload',async context=>{
      let calls=0;await context.route(API,route=>{calls++;return route.abort('internetdisconnected');});
      const page=await context.newPage();await page.goto(base+'/order.html');await fill(page);await page.locator('button[type=submit]').click();await page.waitForURL('**/order-confirmed.html?code=*');
      assert.match(await page.locator('#serverNote').innerText(),/có thể đã tới máy chủ/);const first=page.url();await page.reload();assert.equal(page.url(),first);assert.equal(calls,1);
      assert.match(await page.locator('#smsOrderBtn').getAttribute('href'),/^sms:/);
    });
    await scenario('real 15-second deadline leaves a stalled request unconfirmed',async context=>{
      await context.route(API,()=>{});
      const page=await context.newPage();await page.goto(base+'/order.html');await fill(page);const start=Date.now();await page.locator('button[type=submit]').click();await page.waitForURL('**/order-confirmed.html?code=*',{timeout:22000});
      const elapsed=Date.now()-start;assert.ok(elapsed>=14500 && elapsed<21000,`deadline was ${elapsed}ms`);assert.match(await page.locator('#orderStatus').innerText(),/CHƯA XÁC NHẬN TIẾP NHẬN/);
    });
    await scenario('malformed success response cannot claim acknowledgment',async context=>{
      await context.route(API,route=>route.fulfill({json:{ok:true}}));
      const page=await context.newPage();await page.goto(base+'/order.html');await fill(page);await page.locator('button[type=submit]').click();await page.waitForURL('**/order-confirmed.html?code=*');assert.match(await page.locator('#orderStatus').innerText(),/CHƯA XÁC NHẬN TIẾP NHẬN/);
    });
    await scenario('storage failure after API response displays receipt on the form',async context=>{
      await context.route(API,route=>route.fulfill({json:receipt}));
      await context.addInitScript(()=>{const original=Storage.prototype.setItem;const writes=new WeakMap();Storage.prototype.setItem=function(k,v){const count=writes.get(this)||0;writes.set(this,count+1);if(count>=1)throw new DOMException('Full','QuotaExceededError');return original.call(this,k,v);};});
      const page=await context.newPage();await page.goto(base+'/order.html');await fill(page);await page.locator('button[type=submit]').click();await page.locator('#orderFeedback').waitFor({state:'visible'});assert.match(await page.locator('#orderFeedback').innerText(),/VR-BROWSER-TEST/);assert.equal(page.url(),base+'/order.html');
    });
    await scenario('corrupt storage produces a safe empty receipt on mobile',async context=>{
      const page=await context.newPage();await page.setViewportSize({width:390,height:844});await page.goto(base+'/order.html');await page.evaluate(()=>localStorage.setItem('ak_last_order_v1','{'));await page.goto(base+'/order-confirmed.html');assert.ok(await page.locator('#copyOrderBtn').isDisabled());assert.ok(await page.locator('#smsOrderBtn').isHidden());assert.match(await page.locator('#orderStatus').innerText(),/CHƯA CÓ ĐƠN/);
    });
    console.log(`${passed} browser scenarios passed; production POST requests: 0 (API intercepted).`);
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
