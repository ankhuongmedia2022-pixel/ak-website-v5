(function(){
  const ORDER_KEY='ak_last_order_v1';
  const API='https://ak-ai-shop-orders-api.vercel.app/api/order';
  const FIELDS=['name','phone','email','company','product','package','payment','notes'];
  const DUPLICATE_WINDOW_MS=24*60*60*1000;
  let submitting=false;

  function validReceipt(data){
    return data && !Array.isArray(data) && data.ok===true &&
      typeof data.receiptId==='string' && data.receiptId.trim().length>0 &&
      typeof data.receivedAt==='string' && Number.isFinite(Date.parse(data.receivedAt));
  }
  function readOrders(){
    const orders=[];
    // Prefer this tab's order; use the query code on the receipt page to avoid
    // showing another tab's (or a stale storage fallback's) customer details.
    for(const key of ['sessionStorage','localStorage']){
      try{
        const raw=JSON.parse(window[key].getItem(ORDER_KEY)||'null');
        if(!raw || Array.isArray(raw) || !['code','name','phone','product','package','createdAt'].every(k=>typeof raw[k]==='string' && raw[k].trim()))continue;
        const o={};
        for(const k of [...FIELDS,'code','createdAt','serverReceipt','serverReceivedAt'])o[k]=typeof raw[k]==='string'?raw[k]:'';
        o.serverReceived=raw.serverReceived===true && !!validReceipt({ok:true,receiptId:o.serverReceipt,receivedAt:o.serverReceivedAt});
        o.submissionStartedAt=Number.isFinite(raw.submissionStartedAt)?raw.submissionStartedAt:0;
        o.storageRevision=Number.isSafeInteger(raw.storageRevision)?raw.storageRevision:0;
        orders.push(o);
      }catch(_){}
    }
    return orders;
  }
  function loadOrder(expectedCode=''){
    const orders=readOrders();
    const code=expectedCode || (orders[0] && orders[0].code);
    return orders.filter(o=>o.code===code).sort((a,b)=>b.storageRevision-a.storageRevision)[0] || null;
  }
  function qs(name){return new URLSearchParams(location.search).get(name)||'';}
  function normalizePackage(v){
    const map={
      'AI Setup':'AI Setup — 299k–499k',
      'AI Creator':'AI Creator — 990k–1,9 triệu',
      'AI Business':'AI Business — 2,9–5,9 triệu',
      'AI Media Monthly':'AI Media Monthly — 3,9–9,9 triệu/tháng',
      'Custom App':'Custom App — báo giá theo phạm vi'
    };
    return map[v]||v;
  }
  function code(){
    const d=new Date(), pad=n=>String(n).padStart(2,'0');
    const date=d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate());
    let rand='';
    if(window.crypto && crypto.getRandomValues){
      const a=new Uint32Array(2);crypto.getRandomValues(a);
      rand=Array.from(a,n=>n.toString(16).padStart(8,'0')).join('').toUpperCase();
    }else rand=Math.random().toString(36).slice(2,10).toUpperCase();
    return 'AK-'+date+'-'+rand;
  }
  function statusText(o){return o.serverReceived?'API ĐÃ PHẢN HỒI — CHỜ AN KHƯƠNG XÁC NHẬN':'CHƯA XÁC NHẬN TIẾP NHẬN';}
  function summary(o){
    return [
      'AK AI SHOP — YÊU CẦU ĐẶT HÀNG',
      '--------------------------------',
      'Mã đơn: '+o.code,
      'Trạng thái: '+statusText(o),
      'Khách hàng: '+o.name,
      'Điện thoại: '+o.phone,
      'Email: '+(o.email||''),
      'Công ty: '+(o.company||''),
      'Sản phẩm: '+o.product,
      'Gói / phạm vi: '+o.package,
      'Thanh toán dự kiến: '+(o.payment||''),
      'Yêu cầu: '+(o.notes||''),
      'Tạo lúc: '+o.createdAt,
      'Mã phản hồi API: '+(o.serverReceipt||''),
      '',
      'Hotline xác nhận: 0868 054 679'
    ].join('\n');
  }
  function save(o){
    o.storageRevision=(o.storageRevision||0)+1;
    let saved=false;
    for(const key of ['localStorage','sessionStorage']){
      try{window[key].setItem(ORDER_KEY,JSON.stringify(o));saved=true;}catch(_){}
    }
    return saved;
  }
  function showReceipt(o){location.href='order-confirmed.html?code='+encodeURIComponent(o.code);}
  async function send(order){
    const controller=typeof AbortController==='function'?new AbortController():null;
    let timer;
    // Cover both response headers and body parsing. Aborting a client request
    // does not prove the server did not process it; never automatically retry.
    const deadline=new Promise((_,reject)=>{
      timer=setTimeout(()=>{reject(Error('request_timeout'));if(controller)controller.abort();},15000);
    });
    try{
      const result=await Promise.race([
        (async()=>{
          const res=await fetch(API,{
            method:'POST',headers:{'Content-Type':'application/json'},
            ...(controller?{signal:controller.signal}:{}),body:JSON.stringify(order)
          });
          return {res,data:await res.json()};
        })(),deadline
      ]);
      if(result.res.ok && validReceipt(result.data)){
        order.serverReceived=true;
        order.serverReceipt=result.data.receiptId;
        order.serverReceivedAt=result.data.receivedAt;
      }
    }catch(_){}
    finally{clearTimeout(timer);}
  }

  const form=document.getElementById('orderForm');
  if(form){
    const p=form.elements.product, pk=form.elements.package;
    const qp=qs('product'), qk=normalizePackage(qs('package'));
    if(qp&&[...p.options].some(o=>o.value===qp))p.value=qp;
    if(qk&&[...pk.options].some(o=>o.value===qk))pk.value=qk;
    const submit=form.querySelector('button[type="submit"]');
    function unlock(){
      submitting=false;
      if(submit){submit.disabled=false;submit.textContent='TẠO MÃ ĐƠN HÀNG';}
    }
    window.addEventListener('pageshow',e=>{if(e.persisted)unlock();});
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      if(submitting || !form.reportValidity())return;
      const fd=new FormData(form), fields={};
      for(const k of FIELDS)fields[k]=(fd.get(k)||'').trim();
      if(!fields.name || !fields.phone || !fields.product || !fields.package){alert('Vui lòng nhập họ tên, số điện thoại và chọn sản phẩm, gói.');return;}
      submitting=true;
      if(submit){submit.disabled=true;submit.textContent='ĐANG GỬI YÊU CẦU...';}
      const submitOnce=async()=>{
        const duplicate=readOrders().find(o=>o.submissionStartedAt>0 && Date.now()-o.submissionStartedAt<DUPLICATE_WINDOW_MS && FIELDS.every(k=>o[k]===fields[k]));
        if(duplicate){
          showReceipt(duplicate);
          return;
        }
        const order={...fields,code:code(),createdAt:new Date().toLocaleString('vi-VN'),submissionStartedAt:Date.now(),source:'github-pages',serverReceived:false,serverReceipt:''};
        // Persist the attempt BEFORE posting, so reload/back cannot retry an
        // uncertain request with a new code in the same browser.
        if(!save(order)){
          alert('Không thể lưu mã đơn trên thiết bị. Vui lòng gọi 0868 054 679 để gửi yêu cầu.');
          unlock();return;
        }
        await send(order);
        if(save(order)){showReceipt(order);return;}
        // Do not redirect to an older saved status if storage stopped working.
        const feedback=document.getElementById('orderFeedback');
        if(feedback){
          feedback.hidden=false;
          feedback.textContent='Không thể lưu kết quả trên thiết bị. Hãy sao chép nội dung dưới đây và gọi 0868 054 679 với cùng mã đơn; không gửi lại đơn.\n\n'+summary(order);
        }else alert(summary(order));
        if(submit)submit.textContent='ĐÃ THỬ GỬI — GIỮ MÃ ĐƠN BÊN DƯỚI';
      };
      try{
        // Web Locks serialize tabs on supported browsers. This is a browser
        // guard, not durable server-side idempotency across devices.
        if(navigator.locks && navigator.locks.request)await navigator.locks.request('ak-order-submit',submitOnce);
        else await submitOnce();
      }catch(_){
        alert('Chưa thể hoàn tất. Vui lòng kiểm tra mã đơn đã lưu hoặc gọi 0868 054 679; không gửi lại nếu chưa rõ kết quả.');
        unlock();
      }
    });
  }

  const box=document.getElementById('orderSummary');
  if(box){
    const o=loadOrder(qs('code'));
    if(!o){
      document.getElementById('orderCodeTitle').textContent='Chưa có dữ liệu đơn hàng';
      box.textContent='Không tìm thấy dữ liệu cho mã đơn này trên thiết bị. Nếu đã thử gửi, hãy liên hệ hotline với mã đơn đã lưu; không tạo lại khi chưa rõ kết quả.';
      const sms=document.getElementById('smsOrderBtn');if(sms)sms.style.display='none';
      const cp=document.getElementById('copyOrderBtn');if(cp)cp.disabled=true;
      const status=document.getElementById('orderStatus');if(status)status.textContent='Trạng thái: CHƯA CÓ ĐƠN';
      const note=document.getElementById('serverNote');if(note)note.textContent='Chưa có đơn hợp lệ được lưu trên thiết bị này.';
      return;
    }
    const text=summary(o);
    document.getElementById('orderCodeTitle').textContent='Mã đơn: '+o.code;
    box.textContent=text;
    const status=document.getElementById('orderStatus');
    if(status)status.textContent='Trạng thái: '+statusText(o);
    const note=document.getElementById('serverNote');
    if(note){
      note.textContent=o.serverReceived
        ? 'Website đã nhận mã phản hồi từ API. An Khương Media chưa xác nhận xử lý hoặc chốt đơn. Hãy giữ mã đơn và dùng SMS/hotline để kiểm tra tiếp nhận.'
        : 'Website chưa nhận được xác nhận hợp lệ. Yêu cầu có thể đã tới máy chủ. Không tạo lại đơn; hãy gửi SMS hoặc gọi hotline với cùng mã đơn để kiểm tra.';
    }
    const sms=document.getElementById('smsOrderBtn');
    if(sms)sms.href='sms:+84868054679?body='+encodeURIComponent(text);
    const cp=document.getElementById('copyOrderBtn');
    if(cp)cp.addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText(text);if(window.toast)toast('Đã sao chép đơn hàng.');}
      catch(_){alert('Hãy chọn và sao chép nội dung đơn hàng.');}
    });
  }
})();
