# Pattern format v0

A pattern is a reusable JSON file that says how time and visibility move over a stretch of beats. It knows nothing about any particular song: the beat grid (below) ties it to a song, and the engine combines the two.

Status: draft. Breaking changes are allowed until v1.

## Example

```json
{
  "format": "timebend.pattern",
  "version": 0,
  "name": "Tape stop",
  "lengthBeats": 4,
  "seed": 1,
  "time": [
    { "beat": 0, "source": 0, "shape": "play" },
    { "beat": 3, "source": 3, "shape": "easeOut" },
    { "beat": 4, "source": 3.5 }
  ],
  "gate": {
    "steps": [1, 1, 1, 1],
    "off": "black",
    "attackMs": 0,
    "releaseMs": 0
  }
}
```

## Fields

| Field | Type | Meaning |
| --- | --- | --- |
| `format` | `"timebend.pattern"` | Identifies the file |
| `version` | `0` | Format version |
| `name` | string | Display name |
| `lengthBeats` | number > 0 | Length of one loop of the pattern, in beats. The pattern repeats every `lengthBeats` |
| `seed` | integer | Seed for probability, so the same pattern always renders the same way |
| `time` | array of time points, optional | The time lane. Missing means time plays normally |
| `gate` | object, optional | The gate lane. Missing means always open |

## Time lane

Each point says: at pattern beat `beat`, show source beat `source`. Both are measured in beats from the start of the current loop. Points are sorted by `beat`, the first at beat 0, all within `[0, lengthBeats]`.

The segment from one point to the next follows the first point's `shape`:

| Shape | Source position across the segment | Typical use |
| --- | --- | --- |
| `play` | Starts at this point's `source` and advances at normal speed; the next point may jump | Normal playback, repeats, skips |
| `linear` | Straight line from this point's `source` to the next point's `source` | Half-time, double-time, steady reverse |
| `easeOut` | Starts at full slope and slows to a stop at the next point's `source` | Tape stop |
| `easeIn` | Starts still and speeds up to the next point's `source` | Tape start, rewind spin-up |
| `freeze` | Holds this point's `source` | Freeze frame |

Speed is the slope: a `linear` segment that covers 2 source beats in 4 pattern beats plays at half speed. A falling segment plays in reverse. The last point's shape applies until the end of the loop; `linear`, `easeIn` and `easeOut` need a next point and fall back to `play` without one.

Unlike an audio-only effect, video can read ahead of the playhead, so `source` may be greater than `beat`.

## Gate lane

| Field | Type | Meaning |
| --- | --- | --- |
| `steps` | array of 0 or 1 | One entry per step; steps split `lengthBeats` evenly. 1 is open, 0 is closed |
| `probability` | array of numbers 0 to 1, optional | Per step: the chance an open step stays open on a given loop. Default 1 |
| `off` | `"black"`, `"white"` or `"freeze"` | What video shows while closed. Audio is always silent while closed |
| `attackMs` | number ≥ 0 | Fade-in at the start of an open run |
| `releaseMs` | number ≥ 0 | Fade-out at the end of an open run |

Probability is decided per loop and per step from `seed`, so a render is repeatable.

## Beat grid (project-level, not in the pattern)

The beat grid belongs to the song, so it lives in the project, not the pattern. Either form works:

```json
{ "bpm": 140, "offsetSec": 0.12 }
```

```json
{ "beats": [0.12, 0.55, 0.98, 1.41] }
```

The second form lists the time in seconds of every detected beat and follows tempo drift. Beyond the list, the grid continues at the tempo of its last interval.

## What the engine returns

For a moment on the timeline, the engine returns:

- `sourceSec`: which moment of the source to show or play
- `gain`: 0 to 1, how open the gate is
- `off`: the closed-gate action when `gain` is below 1, otherwise `null`

The pattern starts at a chosen beat (`startBeat`) and loops from there.
