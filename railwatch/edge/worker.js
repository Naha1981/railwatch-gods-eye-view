// RailWatch cases API (Cloudflare Worker + D1, free tier). A workspace is identified by the SHA-256 of a secret code.
const ORIGINS = ['https://naha-railwatch.onrender.com','https://www.nahalabs.co.za','https://nahalabs.co.za','http://localhost:8099'];
const MAX_BODY = 1_500_000;
function cors(req){const o=req.headers.get('Origin')||'';return {'access-control-allow-origin':ORIGINS.includes(o)?o:ORIGINS[0],'access-control-allow-headers':'content-type,x-rw-workspace','access-control-allow-methods':'GET,PUT,OPTIONS','vary':'Origin'}}
function json(req,data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json',...cors(req)}})}
async function ws(req){const c=(req.headers.get('x-rw-workspace')||'').trim();if(c.length<8||c.length>128)return null;const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('rw:'+c));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
export default {
  async fetch(req, env){
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(req)});
    const u=new URL(req.url);
    if(u.pathname==='/api/ships'&&req.method==='GET'){
      const bb=(u.searchParams.get('bbox')||'').split(',').map(Number);
      if(bb.length!==4||bb.some(function(x){return !isFinite(x)}))return json(req,{error:'bbox=south,west,north,east'},400);
      if(!env.AISSTREAM_KEY)return json(req,{error:'ships not configured'},503);
      const ships={};let err='';
      try{
        const r=await fetch('https://stream.aisstream.io/v0/stream',{headers:{Upgrade:'websocket'}});
        const sock=r.webSocket;if(!sock)throw new Error('no socket');
        sock.accept();
        sock.send(JSON.stringify({APIKey:env.AISSTREAM_KEY,BoundingBoxes:[[[bb[0],bb[1]],[bb[2],bb[3]]]],FilterMessageTypes:['PositionReport']}));
        sock.addEventListener('close',function(e){if(!err)err='closed '+e.code});sock.addEventListener('message',function(e){try{const m=JSON.parse(typeof e.data==='string'?e.data:new TextDecoder().decode(e.data));if(m.error)err=String(m.error).slice(0,120);const p=m.Message&&m.Message.PositionReport;if(p&&m.MetaData){ships[m.MetaData.MMSI]={mmsi:m.MetaData.MMSI,name:(m.MetaData.ShipName||'').trim(),lat:p.Latitude,lon:p.Longitude,speed:p.Sog,course:p.Cog,seen:m.MetaData.time_utc}}}catch(x){}});
        await new Promise(function(res){setTimeout(res,7000)});
        try{sock.close()}catch(x){}
      }catch(e){err=String(e&&e.message||e)}
      return json(req,{source:'Live ship tracking (short sample)',count:Object.keys(ships).length,ships:Object.values(ships),error:err||undefined});
    }
    if(u.pathname==='/api/health')return json(req,{ok:true,service:'railwatch-api'});
    const w=await ws(req);
    if(!w)return json(req,{error:'workspace code required (8+ characters)'},401);
    if(u.pathname==='/api/cases'&&req.method==='GET'){
      const r=await env.DB.prepare('SELECT body FROM cases WHERE workspace=? ORDER BY sealed_at ASC LIMIT 1000').bind(w).all();
      return json(req,{cases:r.results.map(x=>JSON.parse(x.body))});
    }
    const m=u.pathname.match(/^\/api\/cases\/([A-Za-z0-9_-]{3,64})$/);
    if(m&&req.method==='PUT'){
      const text=await req.text();if(text.length>MAX_BODY)return json(req,{error:'case too large'},413);
      let c;try{c=JSON.parse(text)}catch(e){return json(req,{error:'bad json'},400)}
      if(c.id!==m[1]||!c.sealedAt||!c.seal)return json(req,{error:'invalid case'},400);
      const old=await env.DB.prepare('SELECT body FROM cases WHERE workspace=? AND id=?').bind(w,c.id).first();
      if(old){const o=JSON.parse(old.body);if(o.seal!==c.seal)return json(req,{error:'sealed record cannot be changed'},409);
        // only response fields may change after sealing
        const merged={...o,arrived:c.arrived,responder:c.responder};
        const om=o.maps||[],nm=c.maps||[];
        if(nm.length>=om.length&&om.every((m,i)=>nm[i]&&nm[i].seal===m.seal))merged.maps=nm;
        await env.DB.prepare('UPDATE cases SET body=?,updated_at=? WHERE workspace=? AND id=?').bind(JSON.stringify(merged),new Date().toISOString(),w,c.id).run();
        return json(req,{ok:true,updated:true});}
      await env.DB.prepare('INSERT INTO cases(workspace,id,sealed_at,body,updated_at) VALUES(?,?,?,?,?)').bind(w,c.id,c.sealedAt,text,new Date().toISOString()).run();
      return json(req,{ok:true,created:true});
    }
    return json(req,{error:'not found'},404);
  }
}
