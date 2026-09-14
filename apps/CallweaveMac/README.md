# Callweave macOS listening host

This is the local implementation behind `traverse:platform/recording-host@0.1.0`.
It owns macOS microphone permission, foreground capture, private audio storage,
and bounded lifecycle events. It does not expose device identifiers, audio bytes,
or local audio paths.

Build and open a correctly bundled development app from the repository root:

```bash
bash scripts/run_callweave_mac_host.sh
```

The script adds the required macOS microphone usage description and ad-hoc
signs the local development bundle before opening it.

Recordings are kept in Application Support under a host-private mapping; only an
opaque `recording:<uuid>` reference belongs to the portable contract. Background
capture and PWA-to-native embedding remain unavailable until a target bridge is
installed, and the PWA must continue to show that truthfully.
