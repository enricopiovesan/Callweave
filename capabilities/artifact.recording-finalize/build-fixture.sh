#!/usr/bin/env bash
set -euo pipefail
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; artifact_path="$script_dir/artifacts/recording-finalize.wasm"; mkdir -p "$script_dir/artifacts"
rustup run "$(rustup show active-toolchain | awk '{print $1}')" rustc "$script_dir/src/agent.rs" --target wasm32-unknown-unknown --crate-type cdylib -O -C panic=abort -C strip=symbols --remap-path-prefix "$script_dir=/traverse-repo/agent" -o "$artifact_path"
digest="$(python3 - "$artifact_path" <<'PY'
import sys
from pathlib import Path
h=0xcbf29ce484222325
for b in Path(sys.argv[1]).read_bytes():h=((h^b)*0x100000001b3)&0xffffffffffffffff
print(f"fnv1a64:{h:016x}")
PY
)"
python3 - "$script_dir/manifest.json" "$digest" <<'PY'
import json,sys
from pathlib import Path
p=Path(sys.argv[1]);d=json.loads(p.read_text());d['binary']['expected_digest']=sys.argv[2];p.write_text(json.dumps(d,indent=2)+'\n')
PY
