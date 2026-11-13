# Web app (phase 2)

Free browser editor and top of the funnel.

Planned stack: TypeScript, WebCodecs for frame decode and encode, WebGL for drawing, Web Audio with an AudioWorklet for onset detection and audio playback, an MP4 muxer library for export. Uses `../core` for all timing math.

First spikes:

- Decode a clip with WebCodecs and draw the frame at any time to a canvas.
- Run onset detection on a song in an AudioWorklet and draw the beats over the waveform.
