(function(){
  const ORDER_KEY='ak_last_order_v1';
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
  function summary(o){
    return [
      'AK AI SHOP — YÊU CẦU ĐẶT HÀNG',
      '--------------------------------',
      'Mã đơn: '+o.code,
      'Trạng thái: CHỜ GỬI XÁC NHẬN',
      'Khách hàng: '+o.name,
      'Điện thoại: '+o.phone,
      'Email: '+(o.email||''),
      'Công ty: '+(o.company||''),
      'Sản phẩm: '+o.product,
      'Gói / phạm vi: '+o.package,
      'Thanh toán dự kiến: '+o.payment,
      'Yêu cầu: '+(o.notes||''),
      'Tạo lúc: '+o.createdAt,
      '',
      'Hotline xác nhận: 0868 054 679'
    ].join('\n');
  }

  const form=document.getElementById('orderForm');
  if(form){
    const p=form.elements.product, pk=form.elements.package;
    const qp=qs('product'), qk=normalizePackage(qs('package'));
    if(qp&&[...p.options].some(o=>o.value===qp))p.value=qp;
    if(qk&&[...pk.options].some(o=>o.value===qk))pk.value=qk;

    form.addEventListener('submit',e=>{
      e.preventDefault();
      const fd=new FormData(form);
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
        createdAt:new Date().toLocaleString('vi-VN')
      };
      try{localStorage.setItem(ORDER_KEY,JSON.stringify(order));}
      catch(err){sessionStorage.setItem(ORDER_KEY,JSON.stringify(order));}
      location.href='order-confirmed.html';
    });
  }

  const box=document.getElementById('orderSummary');
  if(box){
    let raw=null;
    try{raw=localStorage.getItem(ORDER_KEY)||sessionStorage.getItem(ORDER_KEY);}catch(e){}
    if(!raw){
      document.getElementById('orderCodeTitle').textContent='Chưa có dữ liệu đơn hàng';
      box.textContent='Hãy quay lại trang Đặt hàng để tạo yêu cầu mới.';
      const sms=document.getElementById('smsOrderBtn'); if(sms)sms.style.display='none';
      return;
    }
    const o=JSON.parse(raw), text=summary(o);
    document.getElementById('orderCodeTitle').textContent='Mã đơn: '+o.code;
    box.textContent=text;
    const sms=document.getElementById('smsOrderBtn');
    if(sms)sms.href='sms:+84868054679?body='+encodeURIComponent(text);
    const cp=document.getElementById('copyOrderBtn');
    if(cp)cp.addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText(text); if(window.toast)toast('Đã sao chép đơn hàng.');}
      catch(e){alert('Hãy chọn và sao chép nội dung đơn hàng.');}
    });
  }
})();