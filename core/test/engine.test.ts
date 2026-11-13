import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  beatToSec,
  isStepOpen,
  render,
  secToBeat,
  sourceBeatAt,
  validatePattern,
  type BeatGrid,
  type Pattern,
} from '../src/engine.js';

// Compiled tests run from core/dist/test, so the repo root is three levels up.
const patternsDir = fileURLToPath(new URL('../../../patterns/', import.meta.url));
const load = (name: string): Pattern => JSON.parse(readFileSync(patternsDir + name, 'utf8'));

const grid120: BeatGrid = { bpm: 120 }; // 0.5 s per beat
const close = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('every example pattern is valid', () => {
  for (const f of readdirSync(patternsDir).filter((n) => n.endsWith('.json'))) {
    assert.deepEqual(validatePattern(load(f)), [], f);
  }
});

test('validation catches broken patterns', () => {
  const errors = validatePattern({
    format: 'nope',
    version: 1,
    name: '',
    lengthBeats: 0,
    time: [{ beat: 1, source: 0, shape: 'wobble' }],
    gate: { steps: [1, 2], probability: [1], off: 'purple' },
  });
  assert.ok(errors.length >= 7, errors.join('\n'));
});

test('no time lane plays normally', () => {
  const p: Pattern = { format: 'timebend.pattern', version: 0, name: 'Plain', lengthBeats: 4 };
  close(render(p, grid120, 1.37).sourceSec, 1.37);
});

test('half-time plays two beats across four', () => {
  const p = load('half-time.json');
  close(render(p, grid120, 1.0).sourceSec, 0.5); // beat 2 shows beat 1
  close(render(p, grid120, 3.0).sourceSec, 2.5); // second loop: beat 6 shows beat 5
});

test('tape stop slows to a halt', () => {
  const p = load('tape-stop.json');
  close(sourceBeatAt(p, 2), 2); // normal play before the stop
  close(sourceBeatAt(p, 3.5), 3.375); // easing out
  close(sourceBeatAt(p, 3.999999), 3.5, 1e-6); // nearly stopped
});

test('build-up stutter repeats beat one then catches up', () => {
  const p = load('build-up-stutter.json');
  close(sourceBeatAt(p, 1.25), 0.25);
  close(sourceBeatAt(p, 2.6), 0.1);
  close(sourceBeatAt(p, 3.2), 3.2);
});

test('closed steps cut to the off action', () => {
  const p = load('triplet-chop.json');
  // 12 steps over 4 beats = 1/3 beat each; step 2 (beats 0.667 to 1) is closed.
  const closed = render(p, grid120, 0.4); // beat 0.8
  assert.equal(closed.gain, 0);
  assert.equal(closed.off, 'black');
  const open = render(p, grid120, 0.05); // beat 0.1
  assert.equal(open.gain, 1);
  assert.equal(open.off, null);
});

test('release fades out before a closed step', () => {
  const p = load('triplet-chop.json'); // releaseMs 10
  // Step 1 ends at beat 2/3 = 0.3333 s and step 2 is closed.
  const s = render(p, grid120, 1 / 3 - 0.005);
  close(s.gain, 0.5, 1e-6);
});

test('probability is repeatable and roughly right', () => {
  const p = load('triplet-chop.json'); // step 5 has probability 0.75
  assert.equal(isStepOpen(p, 42, 5), isStepOpen(p, 42, 5));
  let open = 0;
  const loops = 4000;
  for (let i = 0; i < loops; i++) if (isStepOpen(p, i, 5)) open++;
  const share = open / loops;
  assert.ok(share > 0.7 && share < 0.8, `share ${share}`);
});

test('freeze holds the frame from the start of the closed step', () => {
  const p: Pattern = {
    format: 'timebend.pattern',
    version: 0,
    name: 'Freeze test',
    lengthBeats: 4,
    gate: { steps: [1, 0, 1, 1], off: 'freeze' },
  };
  const s = render(p, grid120, 0.75); // beat 1.5, inside closed step 1
  assert.equal(s.off, 'freeze');
  close(s.sourceSec, 0.5); // held at beat 1
});

test('a detected beat grid follows tempo drift', () => {
  const grid: BeatGrid = { beats: [0, 0.5, 1.1, 1.6] };
  close(secToBeat(grid, 0.8), 1.5);
  close(beatToSec(grid, 1.5), 0.8);
  close(beatToSec(grid, 4), 2.1); // continues at the last interval
  close(secToBeat(grid, beatToSec(grid, 2.7)), 2.7);
});

test('before startBeat the clip plays untouched', () => {
  const p = load('half-time.json');
  const s = render(p, grid120, 1.0, 4); // beat 2, pattern starts at beat 4
  close(s.sourceSec, 1.0);
  assert.equal(s.gain, 1);
});
