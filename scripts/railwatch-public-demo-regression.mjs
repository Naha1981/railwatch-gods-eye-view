import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const html = readFileSync('railwatch/index.html', 'utf8');
const scripts = [...html.matchAll(/<script src="\.\/([^"]+)"/g)].map(match => readFileSync(`railwatch/${match[1]}`, 'utf8'));
new vm.Script(scripts.join('\n'));
const source = readFileSync('railwatch/public-demo.js', 'utf8');
for (const mode of ['', '?mode=operations']) {
  const context = { window: {}, URLSearchParams, location: { search: mode }, Date };
  vm.runInNewContext(source, context);
  assert.equal(context.window.RailWatchMode.local, !mode);
  const event = context.window.RailWatchDemo.simulate();
  assert.equal(event.incident.assets.length, 3);
  assert.ok(event.event_id.startsWith('LOCAL-DEMO-'));
  assert.ok(event.incident.data_classification.includes('SYNTHETIC'));
}
assert.ok(!/\b(fetch|WebSocket)\s*\(/.test(source));
assert.ok(readFileSync('railwatch/app.js','utf8').includes('baseLayer: false'));
assert.ok(readFileSync('railwatch/whatsapp-journey.js','utf8').includes('observer.disconnect()'));
console.log('classic scripts parse together; local synthetic fixture; explicit operations separation; no public API calls; observer feedback guard: PASS');
