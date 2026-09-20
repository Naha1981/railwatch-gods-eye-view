import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const sourcePath = path.join(process.cwd(), 'railwatch', 'control-room-status.js');

/**
 * Regression contract for two fixes:
 *  - 9dde5d2: re-ingesting the latest incident (including background
 *    hydration) must not move a control-room workflow backwards after an
 *    operator has advanced it (the monotonic stage guard).
 *  - 01378a1: control-room stage events must be one-way -- updateStage()
 *    gained a third `announce` parameter so internal/background callers can
 *    update the DOM without re-emitting `railwatch:stage`.
 */
test('control-room stage updates are monotonic and announce is threaded through', async () => {
  const source = await readFile(sourcePath, 'utf8');

  assert.match(source, /let currentStage = ['"]DETECT['"]/);
  assert.match(source, /const stageIndex = \{ DETECT: 0, LOCATE: 1, VERIFY: 2, RESPOND: 3, RESOLVE: 4, PROVE: 5 \}/);
  assert.match(source, /function updateStage\(stage, allowRegression = false, announce = true\)/);
  assert.match(source, /if \(!allowRegression && stageIndex\[stage\] < stageIndex\[currentStage\]\) return;/);
  assert.match(source, /currentStage = stage;/);
  assert.match(source, /if \(announce\) emit\('railwatch:stage', \{ stage, source: 'control-room-status' \}\);/);
  // ingest() resets to DETECT for a fresh/re-ingested incident (allowRegression
  // = true), but must forward the caller's `announce` flag rather than always
  // re-emitting -- that's the one-way-events contract from 01378a1.
  assert.match(source, /updateStage\('DETECT', true, announce\);/);
});
