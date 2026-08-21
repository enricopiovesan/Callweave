# Callweave persona export map for Traverse registry

Last verified: 2026-08-21

These persona records exist locally in Callweave and must be added to the
target Traverse registry checkout before `traverse-cli capability publish
--dry-run` can resolve `persona_ref` values.

## Source → target mapping

| Persona id | Source in Callweave | Target in registry repo |
|---|---|---|
| `callweave-artist` | [traverse/personas/callweave-artist/1.0.0/persona.json](/Users/enricopiovesan/Documents/repos/Callweave/traverse/personas/callweave-artist/1.0.0/persona.json) | `personas/callweave-artist/1.0.0/persona.json` |
| `callweave-field-operator` | [traverse/personas/callweave-field-operator/1.0.0/persona.json](/Users/enricopiovesan/Documents/repos/Callweave/traverse/personas/callweave-field-operator/1.0.0/persona.json) | `personas/callweave-field-operator/1.0.0/persona.json` |
| `callweave-location-owner` | [traverse/personas/callweave-location-owner/1.0.0/persona.json](/Users/enricopiovesan/Documents/repos/Callweave/traverse/personas/callweave-location-owner/1.0.0/persona.json) | `personas/callweave-location-owner/1.0.0/persona.json` |
| `callweave-reviewer` | [traverse/personas/callweave-reviewer/1.0.0/persona.json](/Users/enricopiovesan/Documents/repos/Callweave/traverse/personas/callweave-reviewer/1.0.0/persona.json) | `personas/callweave-reviewer/1.0.0/persona.json` |
| `callweave-runtime` | [traverse/personas/callweave-runtime/1.0.0/persona.json](/Users/enricopiovesan/Documents/repos/Callweave/traverse/personas/callweave-runtime/1.0.0/persona.json) | `personas/callweave-runtime/1.0.0/persona.json` |
| `callweave-system-administrator` | [traverse/personas/callweave-system-administrator/1.0.0/persona.json](/Users/enricopiovesan/Documents/repos/Callweave/traverse/personas/callweave-system-administrator/1.0.0/persona.json) | `personas/callweave-system-administrator/1.0.0/persona.json` |

## Capabilities blocked by these personas

All app-layer Callweave contracts under
[traverse/contracts/callweave](/Users/enricopiovesan/Documents/repos/Callweave/traverse/contracts/callweave)
reference one or more of these persona ids in `use_cases[].persona_ref`.

The first pure capability publish targets that should be retried after persona
publication are:

1. `location.initialize`
2. `operations.recover`
3. `model.improve`
4. `review.prepare`

## Minimum registry-side sequence

1. Copy these six persona records into the clean registry checkout.
2. Commit the persona additions there.
3. Run the Callweave dry-run publish commands from a clean registry checkout.
