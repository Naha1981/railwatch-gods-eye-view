import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';
const code=readFileSync(new URL('../railwatch/cctv-evidence.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../railwatch/cctv-evidence.css',import.meta.url),'utf8');
test('RailWatch Cameras has a direct entry without requiring an incident',()=>{
 assert.match(code,/rw-cameras-open/); assert.match(code,/Cameras/); assert.match(css,/#rw-cameras-open\{[^}]*min-height:44px/);
});
test('camera reference plays same-site media and is never called live incident footage',()=>{
 assert.match(code,/const VIDEO_MP4_URL = '\.\/media\/railway-reference-1939\.mp4'/);
 assert.match(code,/HISTORIC EXAMPLE · NOT LIVE · NOT THIS INCIDENT/);
 assert.match(code,/REFERENCE ONLY/);
 assert.ok(statSync(new URL('../railwatch/media/railway-reference-1939.mp4',import.meta.url)).size>1000000);
});
test('reference has timeout, advancing-time, retry and close recovery',()=>{
 assert.match(code,/15000/); assert.match(code,/video.currentTime > lastPlaybackTime/);
 assert.match(code,/rw-cctv-retry/); assert.match(code,/Escape/);
});
