(function(){
  const ORDER_KEY='ak_last_order_v1';
  const API='https://ak-ai-shop-orders-api.vercel.app/api/order';
  let submitting=false;
  function loadOrder(){
    for(const key of ['localStorage','sessionStorage']){
      try{
        const o=JSON.parse(window[key].getItem(ORDER_KEY)||'null');
        if(o && typeof o==='object' && ['code','name','phone','product','package','createdAt'].every(k=>typeof o[k]==='string' && o[k].trim())) return o;
      }catch(_){}
    }
    return null;
  }
  function qs(name){return new URLSearchParams(location.search).get(name)||''}
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
    if(window.crypto&&crypto.getRandomValues){
      const a=new Uint32Array(1);crypto.getRandomValues(a);rand=(a[0]%1679616).toString(36).toUpperCase().padStart(4,'0');
    }else rand=Math.random().toString(36).slice(2,6).toUpperCase();
    return 'AK-'+date+'-'+rand;
  }
  function statusText(o){return o.serverReceived?'ĐÃ GỬI HỆ THỐNG — CHỜ XỬ LÝ':'CHỜ GỬI XÁC NHẬN';}
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
      'Thanh toán dự kiến: '+o.payment,
      'Yêu cầu: '+(o.notes||''),
      'Tạo lúc: '+o.createdAt,
      'Server receipt: '+(o.serverReceipt||''),
      '',
      'Hotline xác nhận: 0868 054 679'
    ].join('\n');
  }
  function save(o){
    let saved=false;
    for(const key of ['localStorage','sessionStorage']){
      try{window[key].setItem(ORDER_KEY,JSON.stringify(o));saved=true;}catch(_){}
    }
    return saved;
  }

  const form=document.getElementById('orderForm');
  if(form){
    const p=form.elements.product, pk=form.elements.package;
    const qp=qs('product'), qk=normalizePackage(qs('package'));
    if(qp&&[...p.options].some(o=>o.value===qp))p.value=qp;
    if(qk&&[...pk.options].some(o=>o.value===qk))pk.value=qk;

    form.addEventListener('submit',async e=>{
      e.preventDefault();
      if(submitting || !form.reportValidity())return;
      const fd=new FormData(form), submit=form.querySelector('button[type="submit"]');
      const order={
        code:code(),
        name:(fd.get('name')||'').trim(),
        phone:(fd.get('phone')||'').trim(),
        email:(fd.get('email')||'').trim(),
        company:(fd.get('company')||'').trim(),
        product:fd.get('product')||'',
        package:fd.get('package')||'',
        payment:fd.get('payment')||'',
        notes:(fd.get('notes')||'').trim(),
        createdAt:new Date().toLocaleString('vi-VN'),
        source:'github-pages',
        serverReceived:false,
        serverReceipt:''
      };
      if(!order.name || !order.phone){alert('Vui lòng nhập họ tên và số điện thoại.');return;}
      if(!save(order)){alert('Không thể lưu mã đơn trên thiết bị. Vui lòng gọi 0868 054 679 để gửi yêu cầu.');return;}
      submitting=true;
      if(submit){submit.disabled=true;submit.textContent='ĐANG GỬI YÊU CẦU...';}
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),15000);
      try{
        const res=await fetch(API,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          signal:controller.signal,
          body:JSON.stringify(order)
        });
        const data=await res.json().catch(()=>({}));
        if(res.ok&&data.ok===true){
          order.serverReceived=true;
          order.serverReceipt=data.receiptId||'';
          order.serverReceivedAt=data.receivedAt||'';
          save(order);
        }
      }catch(err){
        order.serverReceived=false;
        save(order);
      }finally{clearTimeout(timer);}
      location.href='order-confirmed.html';
    });
  }

  const box=document.getElementById('orderSummary');
  if(box){
    const o=loadOrder();
    if(!o){
      document.getElementById('orderCodeTitle').textContent='Chưa có dữ liệu đơn hàng';
      box.textContent='Hãy quay lại trang Đặt hàng để tạo yêu cầu mới.';
      const sms=document.getElementById('smsOrderBtn'); if(sms)sms.style.display='none';
      const cp=document.getElementById('copyOrderBtn'); if(cp)cp.disabled=true;
      const status=document.getElementById('orderStatus'); if(status)status.textContent='Trạng thái: CHƯA CÓ ĐƠN';
      const note=document.getElementById('serverNote'); if(note)note.textContent='Chưa có đơn hợp lệ được lưu trên thiết bị này.';
      return;
    }
    o.serverReceived=o.serverReceived===true;
    const text=summary(o);
    document.getElementById('orderCodeTitle').textContent='Mã đơn: '+o.code;
    box.textContent=text;
    const status=document.getElementById('orderStatus');
    if(status)status.innerHTML='Trạng thái: <strong>'+statusText(o)+'</strong>';
    const note=document.getElementById('serverNote');
    if(note){
      note.textContent=o.serverReceived
        ? 'Yêu cầu đã đi vào hệ thống tiếp nhận. Bạn vẫn có thể gửi SMS hoặc gọi hotline nếu cần xử lý gấp.'
        : 'Hệ thống tự động chưa xác nhận đã nhận. Hãy dùng nút SMS hoặc gọi hotline để gửi đơn ngay.';
    }
    const sms=document.getElementById('smsOrderBtn');
    if(sms)sms.href='sms:+84868054679?body='+encodeURIComponent(text);
    const cp=document.getElementById('copyOrderBtn');
    if(cp)cp.addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText(text); if(window.toast)toast('Đã sao chép đơn hàng.');}
      catch(e){alert('Hãy chọn và sao chép nội dung đơn hàng.');}
    });
  }
})();
