# Callweave PWA Traverse app

This is the narrow runtime app consumed by the web presentation layer. Its
only capability creates a bounded capture request plan. It never accesses a
microphone, stores audio, or substitutes for the native capture host.

The state machine is runtime-owned:

`idle → planning → capture_planned | request_rejected`

Clients submit `request_capture` with the capability's declared payload and
render the returned state/events. They do not choose transitions.

## Host setup

From the repository root, run:

```bash
npm run traverse:pwa-runtime:setup
```

This explicitly syncs the public Registry, prepares the exact reference,
activates it against the checked-in development fixture, and registers the app
in its declared local workspace. Re-running verifies the existing registration
matches the manifest; a changed manifest requires a version bump. It does not
start capture hardware.
