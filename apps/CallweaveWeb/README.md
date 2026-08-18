# CallweaveWeb

Browser test app for the current pre-connector Callweave foundation.

It exercises the same shared business-logic modules as the Node and macOS test
surfaces. Today it can run the browser-safe checks directly:

- pure capability fixtures
- business logic smoke

The other checks remain Node-only because they depend on local file-system
scripts rather than browser-safe modules.

## Run

Serve the repository root and open:

```text
/apps/CallweaveWeb/index.html
```
