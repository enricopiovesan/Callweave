# CallweaveMac

Native macOS developer test app for the current pre-connector Callweave
foundation.

It does not execute microphone capture, scheduled execution, durable connector
activation, or local-model host binding itself. A separate Traverse compatible
test bundle now exists for the first connector-bound capability path, but this
native macOS app still exists only to exercise the checks that are already real
today.

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
