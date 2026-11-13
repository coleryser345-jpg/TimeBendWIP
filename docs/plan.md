# Timebend plan (repo copy)

The full product and build plan lives in the Claude doc "Timebend — Product & Build Plan". This is the short version kept with the code.

## Product

- **What:** a beat-synced time and gate effect for video, with a visual pattern editor drawn over the filmstrip and waveform.
- **Who:** short-form editors (free web app), freelance music video editors (paid plugins), producers making their own visuals.
- **Moat:** the visual editor, one pattern file for picture and sound, and reach through web, mobile and Final Cut.
- **Pricing hypothesis:** free web app with capped export; one-time Pro bundle under $99.99; paid pattern packs.

## Architecture

The pattern file (`spec/`) is the contract. The engine (`core/`) turns a pattern plus a beat grid into a source time and a gate gain for any moment. Each host only fetches the frame or audio the engine asks for. The web editor doubles as the in-host panel.

## Phases

1. **Foundation:** repo, pattern format v0, TypeScript reference engine with tests. *(in progress)*
2. **Web prototype:** load clip and song, beat grid, filmstrip editor, live preview, MP4 export. Exit: five editors make an edit they would post.
3. **Shared engine + OpenFX:** port the engine to C++ for WebAssembly and native; Resolve plugin renders the same frames as the web app.
4. **Adobe:** After Effects and Premiere effect plus UXP editor panel; paid beta.
5. **Audio link and launch:** audio plugin on the same pattern, performance mode, Final Cut, public launch.

## First two weeks

- [ ] Create the repo and push the scaffold
- [x] Pattern format v0 with example patterns
- [x] Engine time mapping and gate in TypeScript with tests
- [ ] Spike: decode a clip with WebCodecs and draw a frame at any time to a canvas
- [ ] Spike: onset detection in an AudioWorklet, drawn over the waveform
- [ ] Spike: in the OpenFX sample, fetch a frame from 0.5 seconds earlier
- [ ] Pick the final name and run the trademark search
