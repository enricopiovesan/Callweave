# Native recording host contract

Callweave's PWA is a presentation surface. It never accesses `MediaRecorder`,
requests microphone permission, stores audio, or runs a recording schedule.
Those capabilities belong to an installed/native host which can continue under
the platform's background-audio rules.

## Host responsibilities

1. Own microphone permission and show the platform-native disclosure.
2. Receive a governed capture plan from Traverse, validate that it is current,
   then start and stop capture locally.
3. Maintain the capture lifecycle while backgrounded only where the operating
   system permits it; report interruption or permission loss as host events.
4. Encrypt or otherwise protect local audio according to the host's privacy
   policy, then hand the resulting artifact reference to the governed runtime.
5. Send read-only lifecycle events to the PWA only after the host or runtime
   has established them. The PWA must not infer that recording is occurring.

## Minimal bridge surface

An embedding host may expose `globalThis.CallweaveNativeHost` to the PWA:

```ts
interface CallweaveNativeHost {
  getRecordingAvailability(): Promise<{
    available: boolean;
    reason?: 'not_installed' | 'permission_required' | 'background_unsupported';
  }>;
  subscribeRecordingEvents(listener: (event: unknown) => void): () => void;
}
```

The bridge exposes availability and host-authored events only. It has no
`startRecording()` operation because the host must act on the runtime-approved
plan, not on an ungoverned web-page command.

## Background behavior

Background continuation is not guaranteed by a PWA. The native host must use
the operating system's supported audio/background facility and surface an
explicit `capture_interrupted` or `capture_stopped` event whenever that facility
ends. The PWA renders those events; it does not retry recording itself.
