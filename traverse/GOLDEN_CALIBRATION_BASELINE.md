# Golden calibration baseline

The initial human-confirmed evaluation set contains one sample each for elk,
American black bear, grizzly bear, and cougar. Replay it with:

```bash
npm run sound-samples:evaluate
```

The evaluator records candidate scores, ranks, active/quiet windows, and
clipping. These four samples are sufficient to expose model behavior and
regressions, but not to establish production thresholds: calibration requires
multiple independent confirmed recordings per species plus negative controls
(speech, vehicles, weather, silence, and other local animals).

Until that corpus exists, results remain `candidate` or `unknown`; no score is
promoted to a verified observation solely from this baseline.
