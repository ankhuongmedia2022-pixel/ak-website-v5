const ALLOWED_ORIGINS = new Set([
  'https://ankhuongmedia2022-pixel.github.io',
  'https://ak-website-v5.vercel.app'
]);

function clean(value, max=2000){
  return String(value == null ? '' : value).trim().slice(0,max);
}

module.exports = async function handler(req,res){
  const origin=req.headers.origin||'';
  if(ALLOWED_ORIGINS.has(origin)) res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Cache-Control','no-store');

  if(req.method==='OPTIONS') return res.status(204).end();
  if(req.method!=='POST') return res.status(405).json({ok:false,error:'method_not_allowed'});
  if(origin && !ALLOWED_ORIGINS.has(origin)) return res.status(403).json({ok:false,error:'origin_not_allowed'});

  let body=req.body||{};
  if(typeof body==='string'){
    try{body=JSON.parse(body)}catch(e){return res.status(400).json({ok:false,error:'invalid_json'});}
  }

  const order={
    code:clean(body.code,64),
    name:clean(body.name,160),
    phone:clean(body.phone,80),
    email:clean(body.email,240),
    company:clean(body.company,240),
    product:clean(body.product,240),
    package:clean(body.package,300),
    payment:clean(body.payment,300),
    notes:clean(body.notes,4000),
    createdAt:clean(body.createdAt,120),
    source:'github-pages',
    receivedAt:new Date().toISOString()
  };
  if(!order.code||!order.name||!order.phone||!order.product||!order.package){
    return res.status(400).json({ok:false,error:'missing_required_fields'});
  }

  const receiptId='VR-'+Date.now().toString(36).toUpperCase()+'-'+Math.random().toString(36).slice(2,7).toUpperCase();
  console.log('AK_ORDER_EVENT '+JSON.stringify({...order,receiptId}));
  return res.status(200).json({ok:true,receiptId,receivedAt:order.receivedAt});
};