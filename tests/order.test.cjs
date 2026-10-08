const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../order.js'), 'utf8');
const valid = {code:'AK-TEST', name:'Kiểm thử', phone:'000', product:'Demo', package:'Demo', createdAt:'Test'};
const receipt = {ok:true, receiptId:'VR-TEST', receivedAt:'2026-10-08T07:00:00.000Z'};
function storage(raw=null, {blocked=false, failAfter=Infinity}={}) {
  let writes=0;
  return {
    getItem(){if(blocked)throw Error('blocked');return raw;},
    setItem(k,v){if(blocked || writes++ >= failAfter)throw Error('quota');raw=v;}
  };
}
function run({raw=null, session=null, blocked=false, form=false, localStore, sessionStore,
  fields={}, search='', fetch=async()=>({ok:true,json:async()=>receipt}), locks,
  controller=AbortController, validForm=true}={}) {
  const nodes=Object.fromEntries(['orderSummary','orderCodeTitle','orderStatus','serverNote','smsOrderBtn','copyOrderBtn','orderFeedback'].map(k=>[k,{style:{},addEventListener(){},appendChild(){}}]));
  let submit,resolveTimer;const button={};
  const formNode={elements:{product:{options:[]},package:{options:[]}},reportValidity:()=>validForm,querySelector:()=>button,addEventListener(k,fn){submit=fn;}};
  const events={};
  const context={
    document:{getElementById:k=>k==='orderForm'?(form?formNode:null):(form && k!=='orderFeedback'?null:nodes[k]),createElement:()=>({appendChild(){}})},
    location:{search,href:''},URLSearchParams,Uint32Array,AbortController:controller,Date,Math,JSON,
    alert(message){context.alerted=message;},
    FormData:class{get(k){return ({...valid,...fields})[k]||'';}},fetch,
    setTimeout(fn,delay){resolveTimer=fn;context.timeoutMs=delay;return 1;},
    clearTimeout(){context.timerCleared=true;},navigator:{locks},
    addEventListener(k,fn){events[k]=fn;}
  };
  context.window=context;
  context.localStorage=localStore || storage(raw,{blocked});
  context.sessionStorage=sessionStore || storage(session,{blocked});
  vm.runInNewContext(source,context);
  return {context,nodes,button,submit:()=>submit({preventDefault(){}}),timeout:()=>resolveTimer(),events,
    saved:()=>JSON.parse(context.sessionStorage.getItem() || context.localStorage.getItem())};
}
test('corrupt stored JSON shows empty state',()=>{const r=run({raw:'{'});assert.equal(r.nodes.orderCodeTitle.textContent,'Chưa có dữ liệu đơn hàng');assert.equal(r.nodes.copyOrderBtn.disabled,true);});
test('incomplete stored order shows empty state',()=>assert.match(run({raw:'{}'}).nodes.orderStatus.textContent,/CHƯA CÓ ĐƠN/));
test('valid session survives corrupt local storage',()=>assert.match(run({raw:'{',session:JSON.stringify(valid)}).nodes.orderSummary.textContent,/AK-TEST/));
test('string success never claims receipt',()=>assert.doesNotMatch(run({raw:JSON.stringify({...valid,serverReceived:'false'})}).nodes.orderSummary.textContent,/ĐÃ GỬI HỆ THỐNG|API ĐÃ PHẢN HỒI/));
test('valid receipt saves and double submit makes only one request',async()=>{let calls=0;const r=run({form:true,fetch:async()=>{calls++;return {ok:true,json:async()=>receipt};}});await Promise.all([r.submit(),r.submit()]);assert.equal(calls,1);assert.equal(r.saved().serverReceipt,'VR-TEST');assert.equal(r.saved().serverReceived,true);assert.match(r.context.location.href,/^order-confirmed.html/);assert.equal(r.context.timerCleared,true);});
test('timeout retains unconfirmed order and navigates to fallback',async()=>{const r=run({form:true,fetch:(url,opts)=>new Promise((resolve,reject)=>opts.signal.addEventListener('abort',()=>reject(Error('aborted'))))});const pending=r.submit();r.timeout();await pending;assert.equal(r.saved().serverReceived,false);assert.match(r.context.location.href,/^order-confirmed.html/);assert.equal(r.context.timeoutMs,15000);});
test('HTTP error never marks received',async()=>{const r=run({form:true,fetch:async()=>({ok:false,json:async()=>receipt})});await r.submit();assert.equal(r.saved().serverReceived,false);});
test('blocked storage stops submission',async()=>{let called=false;const r=run({form:true,blocked:true,fetch:async()=>{called=true;}});await r.submit();assert.equal(called,false);assert.ok(r.context.alerted);assert.equal(r.context.location.href,'');});
for(const [name,data] of Object.entries({missingReceipt:{ok:true},nullReceipt:{ok:true,receiptId:null},objectReceipt:{...receipt,receiptId:{}},blankReceipt:{...receipt,receiptId:' '},invalidDate:{...receipt,receivedAt:'invalid'},stringSuccess:{...receipt,ok:'true'},nullBody:null,arrayBody:[]})) {
  test(`malformed API success (${name}) never confirms order`,async()=>{const r=run({form:true,fetch:async()=>({ok:true,json:async()=>data})});await r.submit();assert.equal(r.saved().serverReceived,false);});
}
test('invalid JSON never confirms order',async()=>{const r=run({form:true,fetch:async()=>({ok:true,json:async()=>{throw Error('invalid JSON');}})});await r.submit();assert.equal(r.saved().serverReceived,false);});
test('network rejection preserves all request fields',async()=>{const r=run({form:true,fields:{notes:'Giữ nguyên nội dung'},fetch:async()=>{throw Error('offline');}});await r.submit();assert.equal(r.saved().serverReceived,false);assert.equal(r.saved().notes,'Giữ nguyên nội dung');});
test('confirmation selects requested code instead of stale confirmed local order',()=>{
  const old={...valid,code:'AK-OLD',serverReceived:true,serverReceipt:receipt.receiptId,serverReceivedAt:receipt.receivedAt};
  const r=run({raw:JSON.stringify(old),session:JSON.stringify({...valid,code:'AK-NEW'}),search:'?code=AK-NEW'});
  assert.match(r.nodes.orderCodeTitle.textContent,/AK-NEW/);assert.doesNotMatch(r.nodes.orderSummary.textContent,/API ĐÃ PHẢN HỒI|ĐÃ GỬI HỆ THỐNG/);
});
test('missing requested code never displays another customer order',()=>{const r=run({raw:JSON.stringify(valid),search:'?code=AK-MISSING'});assert.match(r.nodes.orderStatus.textContent,/CHƯA CÓ ĐƠN/);});
test('newer receipt in session wins over stale local state for same code',()=>{
  const r=run({raw:JSON.stringify({...valid,storageRevision:1}),session:JSON.stringify({...valid,storageRevision:2,serverReceived:true,serverReceipt:receipt.receiptId,serverReceivedAt:receipt.receivedAt}),search:'?code=AK-TEST'});
  assert.match(r.nodes.orderSummary.textContent,/VR-TEST/);
});
test('saved true without a valid receipt never claims API acknowledgment',()=>{const r=run({raw:JSON.stringify({...valid,serverReceived:true})});assert.doesNotMatch(r.nodes.orderSummary.textContent,/API ĐÃ PHẢN HỒI|ĐÃ GỬI HỆ THỐNG/);});
test('malformed optional stored fields cannot crash confirmation',()=>{const r=run({raw:JSON.stringify({...valid,notes:{toString:null},email:[],payment:{}})});assert.match(r.nodes.orderSummary.textContent,/AK-TEST/);assert.doesNotMatch(r.nodes.orderSummary.textContent,/\[object Object\]|undefined/);});
test('reload after an uncertain submission reuses code without another POST',async()=>{
  let calls=0;const local=storage(),session=storage();const fetch=async()=>{calls++;throw Error('offline');};
  const first=run({form:true,localStore:local,sessionStore:session,fetch});await first.submit();const code=first.saved().code;
  const second=run({form:true,localStore:local,sessionStore:session,fetch});await second.submit();assert.equal(calls,1);assert.equal(second.saved().code,code);assert.match(second.context.location.href,new RegExp(code));
});
test('failure to persist final receipt keeps the actual outcome visible',async()=>{
  const r=run({form:true,localStore:storage(null,{failAfter:1}),sessionStore:storage(null,{failAfter:1})});await r.submit();
  assert.equal(r.context.location.href,'');assert.equal(r.nodes.orderFeedback.hidden,false);assert.match(r.nodes.orderFeedback.textContent,/VR-TEST/);
});
test('whitespace required field and invalid form do not submit',async()=>{let calls=0;for(const options of [{fields:{name:'  '}},{validForm:false}]){const r=run({form:true,...options,fetch:async()=>{calls++;}});await r.submit();}assert.equal(calls,0);});
test('deadline covers a stalled response body, even without AbortController',async()=>{const r=run({form:true,controller:null,fetch:async()=>({ok:true,json:()=>new Promise(()=>{})})});const pending=r.submit();await Promise.resolve();r.timeout();await pending;assert.equal(r.saved().serverReceived,false);assert.match(r.context.location.href,/^order-confirmed.html/);});
test('late successful response after timeout cannot overwrite uncertain status',async()=>{
  let resolveFetch;const r=run({form:true,fetch:()=>new Promise(resolve=>{resolveFetch=resolve;})});
  const pending=r.submit();r.timeout();await pending;
  resolveFetch({ok:true,json:async()=>receipt});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(r.saved().serverReceived,false);assert.equal(r.saved().serverReceipt,'');
});
test('receipt recovers when only session storage can save a new order',async()=>{
  const old=JSON.stringify({...valid,code:'AK-OLD',serverReceived:true,serverReceipt:receipt.receiptId,serverReceivedAt:receipt.receivedAt});
  const local=storage(old,{failAfter:0}),session=storage();
  const r=run({form:true,localStore:local,sessionStore:session});await r.submit();
  const page=run({localStore:local,sessionStore:session,search:r.context.location.href.split('html')[1]});
  assert.match(page.nodes.orderCodeTitle.textContent,new RegExp(r.saved().code));assert.doesNotMatch(page.nodes.orderCodeTitle.textContent,/AK-OLD/);
});
test('receipt recovers when session storage has a stale order and cannot write',async()=>{
  const local=storage(),session=storage(JSON.stringify({...valid,code:'AK-OLD'}),{failAfter:0});
  const r=run({form:true,localStore:local,sessionStore:session});await r.submit();
  const saved=JSON.parse(local.getItem());
  const page=run({localStore:local,sessionStore:session,search:r.context.location.href.split('html')[1]});
  assert.match(page.nodes.orderCodeTitle.textContent,new RegExp(saved.code));assert.match(page.nodes.orderSummary.textContent,/VR-TEST/);
});
test('returning via back cache restores submit control while retaining duplicate guard',async()=>{
  let calls=0;const r=run({form:true,fetch:async()=>{calls++;return {ok:true,json:async()=>receipt};}});await r.submit();
  r.events.pageshow({persisted:true});assert.equal(r.button.disabled,false);await r.submit();assert.equal(calls,1);
});
test('changing request content creates a distinct order',async()=>{
  let calls=0;const local=storage(),session=storage();const fetch=async()=>{calls++;return {ok:true,json:async()=>receipt};};
  await run({form:true,localStore:local,sessionStore:session,fetch}).submit();
  await run({form:true,localStore:local,sessionStore:session,fields:{notes:'Nội dung mới'},fetch}).submit();assert.equal(calls,2);
});
