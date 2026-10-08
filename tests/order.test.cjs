const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../order.js'),'utf8');
const valid={code:'AK-TEST',name:'Kiểm thử',phone:'000',product:'Demo',package:'Demo',createdAt:'Test'};
const storage=(raw,blocked=false)=>({getItem(){if(blocked)throw Error('blocked');return raw;},setItem(k,v){if(blocked)throw Error('blocked');raw=v;}});
function run({raw=null,session=null,blocked=false,form=false,fetch=async()=>({ok:true,json:async()=>({ok:true})})}={}){
 const nodes=Object.fromEntries(['orderSummary','orderCodeTitle','orderStatus','serverNote','smsOrderBtn','copyOrderBtn'].map(k=>[k,{style:{},addEventListener(){}}]));
 let submit,resolveTimer;const button={};
 const formNode={elements:{product:{options:[]},package:{options:[]}},reportValidity:()=>true,querySelector:()=>button,addEventListener(k,fn){submit=fn;}};
 const context={document:{getElementById:k=>k==='orderForm'?(form?formNode:null):nodes[k]},location:{search:'',href:''},URLSearchParams,Uint32Array,AbortController,Date,Math,JSON,alert(){context.alerted=true;},FormData:class{get(k){return valid[k]||''}},fetch,setTimeout(fn){resolveTimer=fn;return 1;},clearTimeout(){context.timerCleared=true;},navigator:{}};
 context.window=context;context.localStorage=storage(raw,blocked);context.sessionStorage=storage(session,blocked);
 vm.runInNewContext(source,context);
 return {context,nodes,button,submit:()=>submit({preventDefault(){}}),timeout:()=>resolveTimer()};
}
test('corrupt stored JSON shows empty state',()=>{const r=run({raw:'{'});assert.equal(r.nodes.orderCodeTitle.textContent,'Chưa có dữ liệu đơn hàng');assert.equal(r.nodes.copyOrderBtn.disabled,true);});
test('incomplete stored order shows empty state',()=>assert.match(run({raw:'{}'}).nodes.orderStatus.textContent,/CHƯA CÓ ĐƠN/));
test('valid session survives corrupt local storage',()=>assert.match(run({raw:'{',session:JSON.stringify(valid)}).nodes.orderSummary.textContent,/AK-TEST/));
test('string success value does not claim receipt',()=>assert.match(run({raw:JSON.stringify({...valid,serverReceived:'false'})}).nodes.orderStatus.innerHTML,/CHỜ GỬI/));
test('success saves receipt and prevents duplicate submission',async()=>{let calls=0;const r=run({form:true,fetch:async()=>{calls++;return {ok:true,json:async()=>({ok:true,receiptId:'R1'})};}});await Promise.all([r.submit(),r.submit()]);assert.equal(calls,1);assert.equal(JSON.parse(r.context.localStorage.getItem()).serverReceipt,'R1');assert.equal(r.context.location.href,'order-confirmed.html');assert.equal(r.context.timerCleared,true);});
test('timeout retains unconfirmed order and navigates to fallback',async()=>{const r=run({form:true,fetch:(url,opts)=>new Promise((resolve,reject)=>opts.signal.addEventListener('abort',()=>reject(Error('aborted'))))});const pending=r.submit();r.timeout();await pending;assert.equal(JSON.parse(r.context.localStorage.getItem()).serverReceived,false);assert.equal(r.context.location.href,'order-confirmed.html');});
test('HTTP error never marks received',async()=>{const r=run({form:true,fetch:async()=>({ok:false,json:async()=>({ok:true})})});await r.submit();assert.equal(JSON.parse(r.context.localStorage.getItem()).serverReceived,false);});
test('blocked storage stops submission',async()=>{let called=false;const r=run({form:true,blocked:true,fetch:async()=>{called=true;}});await r.submit();assert.equal(called,false);assert.equal(r.context.alerted,true);assert.equal(r.context.location.href,'');});
