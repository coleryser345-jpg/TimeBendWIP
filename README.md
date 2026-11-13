# Timebend

Beat-synced time and gate effects for video, with a pattern you can see and draw.

Draw how time moves over your clip's filmstrip and the song's waveform, and the picture stutters, rewinds, tape-stops and scratches in lockstep with the music. One pattern file drives the web app, native video plugins, and an audio plugin, so picture and sound move together.

> "Timebend" is a working name pending a trademark search.

## Status

Phase 1 (foundation): pattern format v0 and a TypeScript reference engine with tests.

## Repository layout

| Path | What lives there |
| --- | --- |
| `docs/` | Product and build plan |
| `spec/` | Pattern format spec and JSON schema |
| `patterns/` | Example patterns |
| `core/` | Reference engine (TypeScript): pattern + beat grid to source time and gain |
| `web/` | Web app (phase 2) |
| `plugins/ofx/` | OpenFX plugin for Resolve, VEGAS, Nuke, Natron (phase 3) |
| `plugins/adobe/` | After Effects and Premiere effect plus UXP editor panel (phase 4) |
| `plugins/fxplug/` | Final Cut Pro (phase 5) |
| `plugins/audio/` | VST3, AU and CLAP audio plugin (phase 5) |

## Working on the engine

```bash
cd core
npm install
npm test
```

## Ground rules

Everything here is built from our own spec. No decompiled, copied or ported code, UI, presets or tutorial material from Gross Beat, Gross Clip or any other product.

## License

Proprietary. Copyright (c) 2026 Watchdog Software LLC. All rights reserved. See `LICENSE`.
