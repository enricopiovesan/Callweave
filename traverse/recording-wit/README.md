# Generic recording host boundary

`audio.recording-session` is a portable capability contract, not a macOS,
browser, Android, or iOS implementation. Its Wasm Component imports
`traverse:platform/recording-host@0.1.0`; an explicitly activated local target
host supplies that import.

| Target | Host implementation responsibility |
| --- | --- |
| macOS | Map the interface to AVFoundation/Core Audio and its background lifecycle. |
| iOS | Map it to AVAudioSession and platform background rules. |
| Android | Map it to AudioRecord/MediaRecorder and a foreground service. |
| Browser | Map it to MediaDevices only when foreground capture is allowed. |

The interface intentionally transports opaque artifact references, not audio
bytes or host paths. Permission, background execution, device selection, and
storage all remain target-host responsibilities.

## Runtime integration

Traverse `component-wit-v1` now validates the exact WIT import and selected
binding before guest execution. Callweave selects `callweave-local-recording`
for the `local` target family. This declaration activates no native authority
by itself: the target host must register that binding and implement the WIT
operations.

The current PWA remains presentation-only. It cannot be that target host: a
browser can only request foreground microphone capture and cannot provide a
durable background recorder. A native Callweave host may implement the binding
with AVFoundation/Core Audio (or the equivalent target APIs), but those APIs
remain outside this WIT contract and outside the portable component.

The former `callweave:recording/recording-host@0.1.0` draft is retired. It was
input to the Traverse standard, not an alias for the standard identity.
