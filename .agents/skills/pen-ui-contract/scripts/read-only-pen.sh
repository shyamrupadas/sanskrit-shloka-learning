#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../../../.." && pwd)"
canonical_input="$repo_root/design/pen-design.pen"

if ! command -v pen >/dev/null 2>&1; then
  printf 'Blocked: pen.dev CLI is unavailable. Install `pen`, then rerun this launcher.\n' >&2
  exit 2
fi

if [[ ! -f "$canonical_input" ]]; then
  printf 'Blocked: canonical design file is missing at %s.\n' "$canonical_input" >&2
  exit 2
fi

if ! pen status >/dev/null 2>&1; then
  printf 'Blocked: pen.dev CLI is not ready. Run `pen status`; if it reports a signed-out session, run `pen login`, then rerun this launcher.\n' >&2
  exit 2
fi

temporary_root="${TMPDIR:-/tmp}"
temporary_root="${temporary_root%/}"
session_dir="$(mktemp -d "$temporary_root/pen-ui-contract.XXXXXXXX")"
temporary_output="$session_dir/read-only.pen"

cleanup() {
  case "$session_dir" in
    "$temporary_root"/pen-ui-contract.*)
      rm -rf -- "$session_dir"
      ;;
    *)
      printf 'Blocked cleanup of unexpected temporary path: %s\n' "$session_dir" >&2
      ;;
  esac
}

trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

pen interactive --in "$canonical_input" --out "$temporary_output"
