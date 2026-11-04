# PWA runtime integration status

The PWA component now uses an exact `registry_ref` for
`core.prepare-inference-request@1.0.0`; it no longer declares a locally-owned
WASM digest or binary. Registry sync and application preparation therefore
resolve and verify the signed public artifact successfully.

The previous typed-parser activation blocker is resolved in Traverse PR #1788
and Registry 0.31.0. The current activation requirement is an explicit host
activation input for the declared `traverse.audio-input` binding.

The remaining activation work is therefore application fixture/configuration
evidence, not a missing capability or Registry artifact.

The historical activation blocker was in the previously checked-out Traverse
registry manifest schema: its `ApplicationStateInvokeSerde` still requires
`state_machine.states[].invoke.capability_id` and does not accept the runtime's
`invoke.host_connector` form. The raw Traverse state-machine validator already
understands host connectors, and the WASM runtime can dispatch them, but the
application-manifest parser used by `app validate`/`app activate` rejects this
valid host-connector state machine before activation.

This is intentionally not worked around by removing the state machine or by
pretending microphone access is a capability. That would make the registered
application differ from the runtime application and would move host mediation
into presentation code. Once the Traverse application-manifest parser accepts
host-connector invokes, rerun:

```bash
npm run traverse:pwa-runtime:setup
npm run traverse:embedder:smoke
```

The setup script now treats JSON validation failures as process failures rather
than printing a red activation result and exiting successfully.
