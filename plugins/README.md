# Native plugins

Thin host adapters around the shared engine. Each one reads a pattern file, asks the engine which source moment and gain to use, and fetches that frame or audio from the host.

| Folder | Hosts | SDK | Phase |
| --- | --- | --- | --- |
| `ofx/` | DaVinci Resolve, VEGAS Pro, Nuke, Natron | OpenFX (C++) | 3 |
| `adobe/` | After Effects, Premiere Pro | After Effects SDK (C++) plus a UXP panel for the editor | 4 |
| `fxplug/` | Final Cut Pro | FxPlug (Swift and Metal) | 5 |
| `audio/` | Any DAW, Premiere and Resolve audio | VST3, AU and CLAP via JUCE, iPlug2 or nih-plug (license to be checked) | 5 |

First spike (phase 3): in the OpenFX sample plugin, fetch the frame from 0.5 seconds before the playhead and draw it. Every time curve depends on this working in each host.
