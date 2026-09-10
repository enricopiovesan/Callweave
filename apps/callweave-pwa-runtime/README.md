# Callweave PWA Traverse app

This is the narrow runtime app consumed by the web presentation layer. Its
only capability creates a bounded capture request plan. It never accesses a
microphone, stores audio, or substitutes for the native capture host.

The state machine is runtime-owned:

`idle → planning → capture_planned | request_rejected`

Clients submit `request_capture` with the capability's declared payload and
render the returned state/events. They do not choose transitions.
