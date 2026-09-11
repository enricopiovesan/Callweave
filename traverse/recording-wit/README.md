# Generic recording host boundary

`audio.recording-session` is a portable capability contract, not a macOS,
browser, Android, or iOS implementation. Its Wasm component imports the
`recording-host` WIT interface; a local target host supplies that import.

| Target | Host implementation responsibility |
| --- | --- |
| macOS | Map the interface to AVFoundation/Core Audio and its background lifecycle. |
| iOS | Map it to AVAudioSession and platform background rules. |
| Android | Map it to AudioRecord/MediaRecorder and a foreground service. |
| Browser | Map it to MediaDevices only when foreground capture is allowed. |

The interface intentionally transports opaque artifact references, not audio
bytes or host paths. Permission, background execution, device selection, and
storage all remain target-host responsibilities.

## Runtime requirement

This is not active in the current Callweave PWA yet. Current Traverse Host ABI
v1 validates standard WASI plus its mediated connector import; it rejects an
unfulfilled custom WIT import. Traverse needs a Component Model/WIT host ABI
that resolves `callweave:recording/recording-host@0.1.0` for a selected local
target before this capability can be registered and executed.

That runtime enhancement is deliberately separate from the interface: the
same generic capability must compose with each target host without embedding
target-specific code.
