#!/usr/bin/env bash
set -euo pipefail
dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$dir/artifacts"
rustup run "$(rustup show active-toolchain | awk '{print $1}')" rustc "$dir/src/agent.rs" --target wasm32-unknown-unknown --crate-type cdylib -O -C panic=abort -C strip=symbols -o "$dir/artifacts/signal-quality-evaluate.wasm"
python3 - "$dir/artifacts/signal-quality-evaluate.wasm" "$dir/manifest.json" <<'PY'
import hashlib,json,sys
from pathlib import Path
p=Path(sys.argv[2]); d=json.loads(p.read_text()); d['binary']['expected_digest']='sha256:'+hashlib.sha256(Path(sys.argv[1]).read_bytes()).hexdigest(); p.write_text(json.dumps(d,indent=2)+'\n')
PY
