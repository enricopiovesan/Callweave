# CallweaveMac

Native macOS developer test app for the current pre-connector Callweave
foundation.

It does not attempt microphone capture, scheduled execution, durable connector
activation, or local-model host binding. Those remain blocked on Traverse
connector/runtime work. The app exists to exercise the local checks that are
already real today.

## Run

From this directory:

```bash
swift run
```

Or open the package in Xcode:

```bash
xed .
```

The app currently exposes:

- pure capability fixture checks
- business logic smoke tests
- Traverse contract validation
- workflow fixture validation
- audio analyzer CLI help surface
