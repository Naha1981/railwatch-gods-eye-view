import vm from 'node:vm';import fs from 'node:fs';import assert from 'node:assert/strict';
const handlers=new Map(),nodes=new Map();
function node(id){if(!nodes.has(id))nodes.set(id,{textContent:id==='ops-timeline'?'Waiting for an incident…':'',_html:'',get innerHTML(){return this._html},set innerHTML(v){this._html=v;this.textContent=v.replace(/<[^>]*>/g,'')},insertAdjacentHTML(pos,v){this.innerHTML+=v},addEventListener(){},querySelectorAll(){return []},setAttribute(){}});return nodes.get(id)}
const document={createElement:()=>node('panel'),body:{appendChild(){}},getElementById:node,addEventListener:(k,f)=>{handlers.set(k,[...(handlers.get(k)||[]),f])}};
const context={window:{RailWatchMode:{local:true}},location:{search:''},sessionStorage:{getItem:()=>'',setItem(){},removeItem(){}},document,URLSearchParams,clearInterval(){},setInterval(){throw Error('Local must not poll server')},console};
vm.runInNewContext(fs.readFileSync(process.argv[2]||'railwatch/operations-assurance.js','utf8'),context);
for(const f of handlers.get('railwatch:incident'))f({detail:{event_id:'SYNTHETIC-QA-9NOV'}});
assert.ok(node('ops-timeline').textContent.includes('SYNTHETIC-QA-9NOV'),'incident identity absent from assurance timeline');
for(const f of handlers.get('railwatch:stage'))f({detail:{stage:'PROVE'}});
assert.equal(node('ops-stage').textContent,'PROVE');assert.equal(node('ops-rule').textContent,'SYNTHETIC / HUMAN REVIEW');assert.equal(node('ops-health').textContent,'LOCAL MODE');
assert.ok(!node('ops-timeline').textContent.includes('Waiting for an incident'));console.log('PASS synthetic incident identity + stage sync + local-only no server timer');

for(const f of handlers.get('railwatch:incident'))f({detail:{event_id:'SYNTHETIC-QA-SECOND'}});assert.ok(node('ops-timeline').textContent.includes('SYNTHETIC-QA-SECOND'));assert.ok(!node('ops-timeline').textContent.includes('SYNTHETIC-QA-9NOV'));assert.equal(node('ops-stage').textContent,'DETECT');console.log('PASS next incident resets identity and stage');
