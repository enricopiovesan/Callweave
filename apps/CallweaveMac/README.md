# Callweave macOS listening host

This is the local implementation behind `traverse:platform/recording-host@0.1.0`.
It owns macOS microphone permission, foreground capture, private audio storage,
and bounded lifecycle events. It does not expose device identifiers, audio bytes,
or local audio paths.

Run it from this directory with `swift run`.

Recordings are kept in Application Support under a host-private mapping; only an
opaque `recording:<uuid>` reference belongs to the portable contract. Background
capture and PWA-to-native embedding remain unavailable until a target bridge is
installed, and the PWA must continue to show that truthfully.
