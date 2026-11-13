/**
 * Timebend reference engine (pattern format v0).
 *
 * Turns a pattern plus a beat grid into, for any moment on the timeline,
 * which source moment to show and how open the gate is. This TypeScript
 * version is the reference: native ports must match its output.
 *
 * See ../../spec/pattern-format.md for the format this implements.
 */

export type Shape = 'play' | 'linear' | 'easeOut' | 'easeIn' | 'freeze';
export type OffAction = 'black' | 'white' | 'freeze';

export interface TimePoint {
  /** Pattern beat, from the start of the loop. */
  beat: number;
  /** Source beat to show at `beat`, from the start of the loop. */
  source: number;
  /** How the segment to the next point moves. Defaults to `play`. */
  shape?: Shape;
}

export interface Gate {
  /** One entry per step; steps split the loop evenly. 1 = open, 0 = closed. */
  steps: Array<0 | 1>;
  /** Per-step chance an open step stays open on a given loop. Default 1. */
  probability?: number[];
  /** What video shows while closed. Default `black`. */
  off?: OffAction;
  attackMs?: number;
  releaseMs?: number;
}

export interface Pattern {
  format: 'timebend.pattern';
  version: 0;
  name: string;
  lengthBeats: number;
  seed?: number;
  time?: TimePoint[];
  gate?: Gate;
}

/** A song's beat grid: a steady tempo, or the detected time of every beat. */
export type BeatGrid = { bpm: number; offsetSec?: number } | { beats: number[] };

export interface Sample {
  /** Source moment to show or play, in seconds. */
  sourceSec: number;
  /** Gate opening, 0 to 1. */
  gain: number;
  /** Closed-gate action while `gain` is below 1, otherwise null. */
  off: OffAction | null;
}

const SHAPES: readonly Shape[] = ['play', 'linear', 'easeOut', 'easeIn', 'freeze'];
const OFF_ACTIONS: readonly OffAction[] = ['black', 'white', 'freeze'];

// ---------------------------------------------------------------------------
// Beat grid
// ---------------------------------------------------------------------------

/** Seconds at a (possibly fractional) beat. */
export function beatToSec(grid: BeatGrid, beat: number): number {
  if ('bpm' in grid) {
    return (grid.offsetSec ?? 0) + (beat * 60) / grid.bpm;
  }
  const b = grid.beats;
  const last = b.length - 1;
  if (beat <= 0) return b[0] + beat * (b[1] - b[0]);
  if (beat >= last) return b[last] + (beat - last) * (b[last] - b[last - 1]);
  const i = Math.floor(beat);
  return b[i] + (beat - i) * (b[i + 1] - b[i]);
}

/** Beat at a moment in seconds; the inverse of `beatToSec`. */
export function secToBeat(grid: BeatGrid, sec: number): number {
  if ('bpm' in grid) {
    return ((sec - (grid.offsetSec ?? 0)) * grid.bpm) / 60;
  }
  const b = grid.beats;
  const last = b.length - 1;
  if (sec <= b[0]) return (sec - b[0]) / (b[1] - b[0]);
  if (sec >= b[last]) return last + (sec - b[last]) / (b[last] - b[last - 1]);
  // Binary search for the interval holding `sec`.
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (b[mid] <= sec) lo = mid;
    else hi = mid;
  }
  return lo + (sec - b[lo]) / (b[lo + 1] - b[lo]);
}

// ---------------------------------------------------------------------------
// Time lane
// ---------------------------------------------------------------------------

/** Source beat (from the loop start) shown at a pattern beat (from the loop start). */
export function sourceBeatAt(pattern: Pattern, localBeat: number): number {
  const pts = pattern.time;
  if (!pts || pts.length === 0) return localBeat;

  // Last point at or before localBeat.
  let i = 0;
  while (i + 1 < pts.length && pts[i + 1].beat <= localBeat) i++;
  const p = pts[i];
  const n = pts[i + 1];
  const shape = p.shape ?? 'play';
  const span = n ? n.beat - p.beat : 0;

  if (shape === 'freeze') return p.source;
  if (shape === 'play' || !n || span <= 0) return p.source + (localBeat - p.beat);

  const u = (localBeat - p.beat) / span;
  const d = n.source - p.source;
  switch (shape) {
    case 'linear':
      return p.source + d * u;
    case 'easeOut':
      return p.source + d * (1 - (1 - u) * (1 - u));
    case 'easeIn':
      return p.source + d * u * u;
  }
}

// ---------------------------------------------------------------------------
// Gate lane
// ---------------------------------------------------------------------------

/** Deterministic value in [0, 1) for a seed, loop and step (mulberry32 over a mixed key). */
export function stepRandom(seed: number, loop: number, step: number): number {
  let h = (seed | 0) ^ Math.imul(loop | 0, 0x9e3779b1) ^ Math.imul(step | 0, 0x85ebca6b);
  h = (h + 0x6d2b79f5) | 0;
  let t = Math.imul(h ^ (h >>> 15), 1 | h);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Whether a step is open on a given loop, after probability. */
export function isStepOpen(pattern: Pattern, loop: number, step: number): boolean {
  const gate = pattern.gate;
  if (!gate) return true;
  const n = gate.steps.length;
  // Wrap into range so neighbours across loop boundaries resolve correctly.
  const loopAdj = loop + Math.floor(step / n);
  const s = ((step % n) + n) % n;
  if (gate.steps[s] !== 1) return false;
  const p = gate.probability?.[s] ?? 1;
  if (p >= 1) return true;
  return stepRandom(pattern.seed ?? 0, loopAdj, s) < p;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

/**
 * Sample the effect at a timeline moment.
 *
 * @param pattern   the pattern to apply
 * @param grid      the song's beat grid
 * @param timelineSec  the moment on the timeline, in seconds
 * @param startBeat the beat where the pattern begins looping (default 0)
 */
export function render(pattern: Pattern, grid: BeatGrid, timelineSec: number, startBeat = 0): Sample {
  const L = pattern.lengthBeats;
  const rel = secToBeat(grid, timelineSec) - startBeat;
  if (rel < 0) return { sourceSec: timelineSec, gain: 1, off: null };

  const loop = Math.floor(rel / L);
  const local = rel - loop * L;
  const loopStart = startBeat + loop * L;

  let sourceBeat = loopStart + sourceBeatAt(pattern, local);
  let gain = 1;
  const gate = pattern.gate;

  if (gate) {
    const n = gate.steps.length;
    const stepBeats = L / n;
    const step = Math.min(n - 1, Math.floor(local / stepBeats));
    const stepStartBeat = loopStart + step * stepBeats;

    if (!isStepOpen(pattern, loop, step)) {
      gain = 0;
      if ((gate.off ?? 'black') === 'freeze') {
        // Hold the frame that was showing when the step closed.
        sourceBeat = loopStart + sourceBeatAt(pattern, step * stepBeats);
      }
    } else {
      const attack = (gate.attackMs ?? 0) / 1000;
      const release = (gate.releaseMs ?? 0) / 1000;
      if (attack > 0 && !isStepOpen(pattern, loop, step - 1)) {
        const since = timelineSec - beatToSec(grid, stepStartBeat);
        gain = Math.min(gain, since / attack);
      }
      if (release > 0 && !isStepOpen(pattern, loop, step + 1)) {
        const left = beatToSec(grid, stepStartBeat + stepBeats) - timelineSec;
        gain = Math.min(gain, left / release);
      }
      gain = Math.max(0, Math.min(1, gain));
    }
  }

  return {
    sourceSec: beatToSec(grid, sourceBeat),
    gain,
    off: gain < 1 ? (gate?.off ?? 'black') : null,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Problems with a pattern, as readable messages. Empty means valid. */
export function validatePattern(p: unknown): string[] {
  const errors: string[] = [];
  if (typeof p !== 'object' || p === null) return ['pattern must be an object'];
  const x = p as Record<string, unknown>;

  if (x.format !== 'timebend.pattern') errors.push('format must be "timebend.pattern"');
  if (x.version !== 0) errors.push('version must be 0');
  if (typeof x.name !== 'string' || x.name.length === 0) errors.push('name must be a non-empty string');
  const L = x.lengthBeats;
  if (typeof L !== 'number' || !(L > 0)) errors.push('lengthBeats must be a number above 0');
  if (x.seed !== undefined && !Number.isInteger(x.seed)) errors.push('seed must be an integer');

  if (x.time !== undefined) {
    if (!Array.isArray(x.time) || x.time.length === 0) {
      errors.push('time must be a non-empty array');
    } else {
      x.time.forEach((pt: any, i: number) => {
        if (typeof pt?.beat !== 'number' || typeof pt?.source !== 'number') {
          errors.push(`time[${i}] needs numeric beat and source`);
          return;
        }
        if (pt.shape !== undefined && !SHAPES.includes(pt.shape)) errors.push(`time[${i}].shape is not a known shape`);
        if (pt.beat < 0 || (typeof L === 'number' && pt.beat > L)) errors.push(`time[${i}].beat is outside the loop`);
        if (i > 0 && pt.beat < (x.time as any[])[i - 1].beat) errors.push(`time[${i}] is out of order`);
      });
      if ((x.time as any[])[0]?.beat !== 0) errors.push('time must start at beat 0');
    }
  }

  if (x.gate !== undefined) {
    const g = x.gate as Record<string, any>;
    if (!Array.isArray(g.steps) || g.steps.length === 0 || g.steps.some((s: unknown) => s !== 0 && s !== 1)) {
      errors.push('gate.steps must be a non-empty array of 0 and 1');
    }
    if (g.probability !== undefined) {
      if (!Array.isArray(g.probability) || g.probability.length !== g.steps?.length) {
        errors.push('gate.probability must have one entry per step');
      } else if (g.probability.some((v: unknown) => typeof v !== 'number' || v < 0 || v > 1)) {
        errors.push('gate.probability values must be between 0 and 1');
      }
    }
    if (g.off !== undefined && !OFF_ACTIONS.includes(g.off)) errors.push('gate.off must be black, white or freeze');
    for (const k of ['attackMs', 'releaseMs']) {
      if (g[k] !== undefined && !(typeof g[k] === 'number' && g[k] >= 0)) errors.push(`gate.${k} must be 0 or more`);
    }
  }

  return errors;
}
