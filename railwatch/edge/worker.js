// RailWatch cases API (Cloudflare Worker + D1, free tier). A workspace is identified by the SHA-256 of a secret code.
const ORIGINS = ['https://naha-railwatch.onrender.com','https://www.nahalabs.co.za','https://nahalabs.co.za','http://localhost:8099'];
const MAX_BODY = 1_500_000;
function cors(req){const o=req.headers.get('Origin')||'';return {'access-control-allow-origin':ORIGINS.includes(o)?o:ORIGINS[0],'access-control-allow-headers':'content-type,x-rw-workspace,authorization','access-control-allow-methods':'GET,PUT,POST,DELETE,OPTIONS','vary':'Origin'}}
function json(req,data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json',...cors(req)}})}
async function ws(req){const c=(req.headers.get('x-rw-workspace')||'').trim();if(c.length<8||c.length>128)return null;const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('rw:'+c));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
const hex=function(b){return [...new Uint8Array(b)].map(function(x){return x.toString(16).padStart(2,'0')}).join('')};
async function pbk(pw,saltHex){const salt=new Uint8Array(saltHex.match(/../g).map(function(h){return parseInt(h,16)}));const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:salt,iterations:100000},k,256))}
function rnd(n){return hex(crypto.getRandomValues(new Uint8Array(n)))}
async function sha(t){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t)))}
async function newSession(env,email){const t=rnd(32);await env.DB.prepare('INSERT INTO sessions (token_hash,email,created_at) VALUES (?,?,?)').bind(await sha('tok:'+t),email,new Date().toISOString()).run();return t}
async function me(req,env){
  const h=req.headers.get('authorization')||'';if(!/^Bearer [0-9a-f]{64}$/.test(h))return null;
  const s=await env.DB.prepare('SELECT email FROM sessions WHERE token_hash=?').bind(await sha('tok:'+h.slice(7))).first();if(!s)return null;
  const u=await env.DB.prepare('SELECT u.email,u.role,u.org_id,o.name,o.code FROM users u JOIN orgs o ON o.id=u.org_id WHERE u.email=?').bind(s.email).first();return u||null;
}
async function wsKey(req,env){
  const h=req.headers.get('authorization')||'';
  if(h){const u=await me(req,env);return u?{key:await sha('rw:'+u.code),user:u}:{bad:true}}
  const c=(req.headers.get('x-rw-workspace')||'').trim();if(c.length<8||c.length>128)return null;return {key:await sha('rw:'+c)};
}
function view(u,token){return {email:u.email,role:u.role,org:u.name,code:u.code,token:token}}
async function account(req,env,kind){
  let b;try{b=await req.json()}catch(e){return json(req,{error:'Send email and password.'},400)}
  const email=String(b.email||'').trim().toLowerCase(),pw=String(b.password||'');
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||email.length>200)return json(req,{error:'Enter a valid email address.'},400);
  if(pw.length<8||pw.length>200)return json(req,{error:'Use a password of at least 8 characters.'},400);
  const row=await env.DB.prepare('SELECT * FROM users WHERE email=?').bind(email).first();
  const now=new Date().toISOString();
  if(kind==='signup'){
    if(row)return json(req,{error:'An account with this email already exists. Log in instead.'},409);
    const salt=rnd(16),hash=await pbk(pw,salt);
    const pend=await env.DB.prepare('SELECT * FROM pending_members WHERE email=?').bind(email).first();
    let orgId,role;
    if(pend){orgId=pend.org_id;role=pend.role;await env.DB.prepare('DELETE FROM pending_members WHERE email=?').bind(email).run()}
    else{orgId='org_'+rnd(8);role='owner';const name=String(b.org||'').trim().slice(0,80)||'My organisation';await env.DB.prepare('INSERT INTO orgs (id,name,code,created_at) VALUES (?,?,?,?)').bind(orgId,name,rnd(24),now).run()}
    await env.DB.prepare('INSERT INTO users (email,salt,hash,code,created_at,org_id,role) VALUES (?,?,?,?,?,?,?)').bind(email,salt,hash,'-',now,orgId,role).run();
    const u=await me2(env,email);return json(req,view(u,await newSession(env,email)),201);
  }
  if(!row)return json(req,{error:'Email or password is not right.'},401);
  if(row.locked_until&&row.locked_until>now)return json(req,{error:'Too many tries. Wait 15 minutes and try again.'},429);
  if(await pbk(pw,row.salt)!==row.hash){
    const f=(row.fails||0)+1;await env.DB.prepare('UPDATE users SET fails=?,locked_until=? WHERE email=?').bind(f>=10?0:f,f>=10?new Date(Date.now()+900000).toISOString():null,email).run();
    return json(req,{error:'Email or password is not right.'},401);
  }
  await env.DB.prepare('UPDATE users SET fails=0,locked_until=NULL WHERE email=?').bind(email).run();
  if(!row.org_id){const id='org_'+rnd(8);await env.DB.batch([env.DB.prepare('INSERT INTO orgs (id,name,code,created_at) VALUES (?,?,?,?)').bind(id,'My organisation',row.code,now),env.DB.prepare("UPDATE users SET org_id=?,role='owner' WHERE email=?").bind(id,email)])}
  const u=await me2(env,email);return json(req,view(u,await newSession(env,email)));
}
async function me2(env,email){return env.DB.prepare('SELECT u.email,u.role,u.org_id,o.name,o.code FROM users u JOIN orgs o ON o.id=u.org_id WHERE u.email=?').bind(email).first()}
async function orgApi(req,env,u,path){
  if(path==='/api/org'&&req.method==='GET'){
    const m=await env.DB.prepare('SELECT email,role FROM users WHERE org_id=? ORDER BY created_at').bind(u.org_id).all();
    const p=await env.DB.prepare('SELECT email,role FROM pending_members WHERE org_id=?').bind(u.org_id).all();
    return json(req,{org:u.name,me:{email:u.email,role:u.role},members:m.results,waiting:p.results});
  }
  if(path==='/api/org/members'&&req.method==='POST'){
    if(u.role!=='owner'&&u.role!=='admin')return json(req,{error:'Only an owner or admin can add people.'},403);
    let b;try{b=await req.json()}catch(e){return json(req,{error:'Send email and role.'},400)}
    const email=String(b.email||'').trim().toLowerCase(),role=b.role==='admin'?'admin':'member';
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return json(req,{error:'Enter a valid email address.'},400);
    if(role==='admin'&&u.role!=='owner')return json(req,{error:'Only the owner can add an admin.'},403);
    if(await env.DB.prepare('SELECT 1 FROM users WHERE email=?').bind(email).first())return json(req,{error:'That email already has an account. Ask them to use a different email for this organisation.'},409);
    await env.DB.prepare('INSERT OR REPLACE INTO pending_members (email,org_id,role,added_by,created_at) VALUES (?,?,?,?,?)').bind(email,u.org_id,role,u.email,new Date().toISOString()).run();
    return json(req,{ok:true,email:email,role:role});
  }
  if(path==='/api/org/members'&&req.method==='DELETE'){
    let b;try{b=await req.json()}catch(e){return json(req,{error:'Send email.'},400)}
    const email=String(b.email||'').trim().toLowerCase();
    if(u.role!=='owner'&&u.role!=='admin')return json(req,{error:'Only an owner or admin can remove people.'},403);
    const t=await env.DB.prepare('SELECT email,role FROM users WHERE email=? AND org_id=?').bind(email,u.org_id).first();
    if(!t){await env.DB.prepare('DELETE FROM pending_members WHERE email=? AND org_id=?').bind(email,u.org_id).run();return json(req,{ok:true})}
    if(t.role==='owner')return json(req,{error:'The owner cannot be removed.'},403);
    if(t.role==='admin'&&u.role!=='owner')return json(req,{error:'Only the owner can remove an admin.'},403);
    await env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE email=?').bind(email),env.DB.prepare('DELETE FROM users WHERE email=?').bind(email)]);
    return json(req,{ok:true});
  }
  return null;
}
export default {
  async fetch(req, env){
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(req)});
    const u=new URL(req.url);
    if(req.method==='POST'&&(u.pathname==='/api/signup'||u.pathname==='/api/login'))return account(req,env,u.pathname.slice(5));
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
    const k=await wsKey(req,env);
    if(k&&k.bad)return json(req,{error:'Please log in again.'},401);
    if(!k)return json(req,{error:'workspace code required (8+ characters)'},401);
    if(u.pathname.startsWith('/api/org')){if(!k.user)return json(req,{error:'Log in to manage an organisation.'},401);const r=await orgApi(req,env,k.user,u.pathname);if(r)return r}
    const w=k.key;
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
