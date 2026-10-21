// RailWatch worker API assertions. Runs against the local worker started by run-tests.sh.
// Every check is a real HTTP call; no mocks. Exits non-zero on the first failure summary.
const BASE = process.env.RW_TEST_BASE || 'http://127.0.0.1:8790';
const WRANGLER = process.env.WRANGLER || 'npx wrangler';
const PERSIST = process.env.RW_TEST_PERSIST;
const okOrigin = 'https://railwatch.nahalabs.co.za';
let pass = 0, fail = 0;
const fails = [];
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; fails.push(name); console.log('  FAIL ' + name + (detail ? ' :: ' + detail : '')); }
}
async function api(path, opts = {}, headers = {}) {
  const r = await fetch(BASE + path, { ...opts, headers: { 'content-type': 'application/json', ...headers } });
  let body = null; try { body = await r.json(); } catch (e) {}
  return { status: r.status, body, headers: r.headers };
}
async function sha(t) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
function sealedCase(id, extra = {}) {
  const c = { id, type: 'cable-theft', occurred: '2026-10-21T10:00:00.000Z', sealedAt: '2026-10-21T10:05:00.000Z',
    lat: -26.2, lon: 28.0, desc: 'test evidence case', files: [], prev: '0', ...extra };
  return c;
}
async function seal(c) {
  return sha(String(c.prev) + JSON.stringify({ id: c.id, type: c.type, occurred: c.occurred, sealedAt: c.sealedAt,
    lat: c.lat, lon: c.lon, desc: c.desc, files: (c.files || []).map(x => x && x.sha256) }));
}
const ts = Date.now();
const A = { email: `a${ts}@test.invalid`, pw: 'Passw0rd!aaaa' };
const B = { email: `b${ts}@test.invalid`, pw: 'Passw0rd!bbbb' };

console.log('signup + auth');
{
  const weak = await api('/api/signup', { method: 'POST', body: JSON.stringify({ email: A.email, password: 'short' }) });
  check('weak password rejected 400', weak.status === 400);
  const su = await api('/api/signup', { method: 'POST', body: JSON.stringify({ email: A.email, password: A.pw, org: 'Org A' }) });
  check('owner signup 201 with token+code', su.status === 201 && su.body.token && su.body.code);
  A.token = su.body.token; A.code = su.body.code;
  const noauth = await api('/api/cases');
  check('no credentials -> 401', noauth.status === 401);
  const badtok = await api('/api/cases', {}, { authorization: 'Bearer ' + '0'.repeat(64) });
  check('unknown bearer -> 401', badtok.status === 401);
  const li = await api('/api/login', { method: 'POST', body: JSON.stringify({ email: A.email, password: A.pw }) });
  check('login ok 200', li.status === 200 && li.body.token);
}
console.log('lockout');
{
  let last;
  for (let i = 0; i < 10; i++) last = await api('/api/login', { method: 'POST', body: JSON.stringify({ email: A.email, password: 'WrongPass1!' }) });
  const locked = await api('/api/login', { method: 'POST', body: JSON.stringify({ email: A.email, password: A.pw }) });
  check('10 wrong passwords -> 429 lockout', locked.status === 429, 'got ' + locked.status);
  // clear the lockout directly in the scratch DB so later checks are unaffected
  const { execSync } = await import('node:child_process');
  execSync(`${WRANGLER} d1 execute railwatch --local --persist-to "${PERSIST}" --command "UPDATE users SET fails=0, locked_until=NULL WHERE email='${A.email}'"`, { stdio: 'pipe' });
  const relog = await api('/api/login', { method: 'POST', body: JSON.stringify({ email: A.email, password: A.pw }) });
  check('lockout cleared (test hygiene) -> login ok', relog.status === 200);
  A.token = relog.body.token;
}
console.log('CORS canonical origin');
{
  const pre = await fetch(BASE + '/api/cases', { method: 'OPTIONS', headers: { Origin: okOrigin, 'access-control-request-method': 'GET' } });
  check('preflight echoes canonical origin', pre.headers.get('access-control-allow-origin') === okOrigin, pre.headers.get('access-control-allow-origin'));
  const evil = await fetch(BASE + '/api/cases', { method: 'OPTIONS', headers: { Origin: 'https://evil.example', 'access-control-request-method': 'GET' } });
  check('unknown origin NOT echoed', evil.headers.get('access-control-allow-origin') !== 'https://evil.example');
}
console.log('sealed cases');
{
  const c = sealedCase('case-a-1'); c.seal = 'bogus';
  const bad = await api('/api/cases/case-a-1', { method: 'PUT', body: JSON.stringify(c) }, { authorization: 'Bearer ' + A.token });
  check('bad seal -> 422', bad.status === 422, 'got ' + bad.status);
  c.seal = await seal(c);
  const put = await api('/api/cases/case-a-1', { method: 'PUT', body: JSON.stringify(c) }, { authorization: 'Bearer ' + A.token });
  check('valid sealed case -> created', put.status === 200 && put.body.created);
  const tampered = sealedCase('case-a-1', { desc: 'changed after sealing' }); tampered.seal = 'different';
  const t = await api('/api/cases/case-a-1', { method: 'PUT', body: JSON.stringify(tampered) }, { authorization: 'Bearer ' + A.token });
  check('seal change on existing case -> 409', t.status === 409, 'got ' + t.status);
}
console.log('org isolation');
{
  const su = await api('/api/signup', { method: 'POST', body: JSON.stringify({ email: B.email, password: B.pw, org: 'Org B' }) });
  B.token = su.body.token; B.code = su.body.code;
  const cB = sealedCase('case-b-1'); cB.seal = await seal(cB);
  await api('/api/cases/case-b-1', { method: 'PUT', body: JSON.stringify(cB) }, { authorization: 'Bearer ' + B.token });
  const listA = await api('/api/cases', {}, { authorization: 'Bearer ' + A.token });
  check('org A cannot see org B case', listA.status === 200 && !listA.body.cases.some(x => x.id === 'case-b-1'));
  const wsA = await api('/api/cases', {}, { 'x-rw-workspace': A.code });
  check("org A's workspace code as anonymous code -> 401 (must log in)", wsA.status === 401);
}
console.log('stage audit (server-stamped, forge-proof)');
{
  const forged = { stage: 'VERIFY', at: '1999-01-01T00:00:00.000Z', by: 'attacker@evil.example' };
  const st = await api('/api/cases/case-a-1/stages', { method: 'POST', body: JSON.stringify(forged) }, { authorization: 'Bearer ' + A.token });
  check('stage POST accepted', st.status === 200 && st.body.ok);
  check('server stamps time (client at ignored)', st.body.entry.at !== forged.at && Date.parse(st.body.entry.at) > Date.parse('2026-01-01'));
  check('server stamps actor (client by ignored)', st.body.entry.by === A.email);
  const unknown = await api('/api/cases/case-a-1/stages', { method: 'POST', body: JSON.stringify({ stage: 'FLY' }) }, { authorization: 'Bearer ' + A.token });
  check('unknown stage -> 400', unknown.status === 400);
  const missing = await api('/api/cases/nope-404/stages', { method: 'POST', body: JSON.stringify({ stage: 'VERIFY' }) }, { authorization: 'Bearer ' + A.token });
  check('stage on missing case -> 404', missing.status === 404);
  const ev = await api('/api/events', {}, { authorization: 'Bearer ' + A.token });
  const evA = ev.body.events.find(x => x.id === 'case-a-1');
  check('events include verified stage row', evA && evA.stages.some(s => s.stage === 'VERIFY' && s.verified === true && !s.legacy));
  // legacy embedded stages are labelled, never presented as verified
  const legacyCase = sealedCase('case-a-legacy', { stages: [{ stage: 'DISPATCH', at: '2026-10-01T00:00:00.000Z', by: 'old-client' }] });
  legacyCase.seal = await seal(legacyCase);
  await api('/api/cases/case-a-legacy', { method: 'PUT', body: JSON.stringify(legacyCase) }, { authorization: 'Bearer ' + A.token });
  const ev2 = await api('/api/events', {}, { authorization: 'Bearer ' + A.token });
  const evL = ev2.body.events.find(x => x.id === 'case-a-legacy');
  check('legacy embedded stage labelled legacy:true', evL && evL.stages.some(s => s.stage === 'DISPATCH' && s.legacy === true && !s.verified));
  // client PUT cannot overwrite stages or arrived
  const steal = { ...legacyCase, stages: [], arrived: null, responder: null };
  await api('/api/cases/case-a-legacy', { method: 'PUT', body: JSON.stringify(steal) }, { authorization: 'Bearer ' + A.token });
  const ev3 = await api('/api/events', {}, { authorization: 'Bearer ' + A.token });
  const evL2 = ev3.body.events.find(x => x.id === 'case-a-legacy');
  check('PUT cannot erase legacy stage entries', evL2.stages.some(s => s.stage === 'DISPATCH'));
}
console.log('session expiry (30 days)');
{
  const C = { email: `c${ts}@test.invalid`, pw: 'Passw0rd!cccc' };
  const su = await api('/api/signup', { method: 'POST', body: JSON.stringify({ email: C.email, password: C.pw }) });
  const before = await api('/api/cases', {}, { authorization: 'Bearer ' + su.body.token });
  check('fresh session works', before.status === 200);
  const { execSync } = await import('node:child_process');
  const old = new Date(Date.now() - 31 * 24 * 3600 * 1000).toISOString();
  execSync(`${WRANGLER} d1 execute railwatch --local --persist-to "${PERSIST}" --command "UPDATE sessions SET created_at='${old}' WHERE email='${C.email}'"`, { stdio: 'pipe' });
  const after = await api('/api/cases', {}, { authorization: 'Bearer ' + su.body.token });
  check('session older than 30 days -> 401', after.status === 401, 'got ' + after.status);
  const stillThere = execSync(`${WRANGLER} d1 execute railwatch --local --persist-to "${PERSIST}" --command "SELECT count(*) c FROM sessions WHERE email='${C.email}'" --json`, { stdio: 'pipe' }).toString();
  check('expired session row deleted', /"c":\s*0|"c":0/.test(stillThere), stillThere.slice(0, 120));
}
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) { console.log('FAILED: ' + fails.join(' | ')); process.exit(1); }
