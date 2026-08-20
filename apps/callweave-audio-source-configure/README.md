# Callweave audio-source-configure compatible test app

This app bundle exercises the first host-integrated compatible-mode component
for Callweave. It is intentionally narrow: one compatible component, one
workflow, and one wrapper that proves the registration surface for a
connector-bound capability without pretending that microphone capture is
already implemented end to end.

Generate these files with:

```bash
node scripts/generate_callweave_audio_source_app.mjs
```
