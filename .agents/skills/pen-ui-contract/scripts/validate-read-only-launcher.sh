#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
skill_dir="$(cd "$script_dir/.." && pwd)"
repo_root="$(cd "$skill_dir/../../.." && pwd)"
launcher="$script_dir/read-only-pen.sh"
temporary_root="${TMPDIR:-/tmp}"
temporary_root="${temporary_root%/}"
test_dir="$(mktemp -d "$temporary_root/pen-ui-contract-test.XXXXXXXX")"

cleanup() {
  rm -rf -- "$test_dir"
}
trap cleanup EXIT

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

fake_bin="$test_dir/bin"
mkdir -p "$fake_bin"

cat > "$fake_bin/pen" <<'FAKE_PEN'
#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "status" ]]; then
  printf 'Authenticated\n'
  exit "${PEN_TEST_STATUS_EXIT:-0}"
fi

[[ "${1:-}" == "interactive" ]] || exit 90
shift
[[ -t 0 && -t 1 ]] || exit 92

input=""
output=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --in)
      input="$2"
      shift 2
      ;;
    --out)
      output="$2"
      shift 2
      ;;
    *)
      exit 91
      ;;
  esac
done

printf '%s\n' "$input" > "$PEN_TEST_INPUT_LOG"
printf '%s\n' "$output" > "$PEN_TEST_OUTPUT_LOG"
IFS= read -r probe
printf '%s\n' "$probe" > "$PEN_TEST_STDIN_LOG"
printf 'temporary design\n' > "$output"
printf 'FAKE_PEN_INTERACTIVE\n'
exit "${PEN_TEST_EXIT_STATUS:-0}"
FAKE_PEN
chmod +x "$fake_bin/pen"

input_log="$test_dir/input.log"
output_log="$test_dir/output.log"
stdin_log="$test_dir/stdin.log"
stdout_log="$test_dir/stdout.log"
pty_runner='import os, pty, sys; status = pty.spawn([sys.argv[1]]); raise SystemExit(os.waitstatus_to_exitcode(status))'

printf 'pty-probe\n' | env \
  PATH="$fake_bin:$PATH" \
  PEN_TEST_INPUT_LOG="$input_log" \
  PEN_TEST_OUTPUT_LOG="$output_log" \
  PEN_TEST_STDIN_LOG="$stdin_log" \
  python3 -c "$pty_runner" "$launcher" > "$stdout_log"

[[ "$(<"$input_log")" == "$repo_root/design/pen-design.pen" ]] || fail "launcher did not pass the canonical input"
[[ "$(<"$stdin_log")" == "pty-probe" ]] || fail "launcher did not preserve interactive PTY stdin"
grep -q 'FAKE_PEN_INTERACTIVE' "$stdout_log" || fail "launcher did not preserve interactive PTY stdout"

temporary_output="$(<"$output_log")"
[[ "$temporary_output" == "$temporary_root"/pen-ui-contract.*/*.pen ]] || fail "launcher did not use a unique temporary .pen output"
[[ ! -e "$temporary_output" ]] || fail "launcher left the temporary output behind"
[[ ! -d "$(dirname "$temporary_output")" ]] || fail "launcher left the temporary directory behind"

second_output_log="$test_dir/second-output.log"
printf 'second-probe\n' | env \
  PATH="$fake_bin:$PATH" \
  PEN_TEST_INPUT_LOG="$test_dir/second-input.log" \
  PEN_TEST_OUTPUT_LOG="$second_output_log" \
  PEN_TEST_STDIN_LOG="$test_dir/second-stdin.log" \
  python3 -c "$pty_runner" "$launcher" > "$test_dir/second-stdout.log"

second_temporary_output="$(<"$second_output_log")"
[[ "$second_temporary_output" != "$temporary_output" ]] || fail "launcher reused a temporary output"
[[ ! -d "$(dirname "$second_temporary_output")" ]] || fail "launcher left the second temporary directory behind"

failed_output_log="$test_dir/failed-output.log"
set +e
printf 'failure-probe\n' | env \
  PATH="$fake_bin:$PATH" \
  PEN_TEST_INPUT_LOG="$test_dir/failed-input.log" \
  PEN_TEST_OUTPUT_LOG="$failed_output_log" \
  PEN_TEST_STDIN_LOG="$test_dir/failed-stdin.log" \
  PEN_TEST_EXIT_STATUS=23 \
  python3 -c "$pty_runner" "$launcher" > "$test_dir/failed-stdout.log"
failed_status=$?
set -e

[[ "$failed_status" -eq 23 ]] || fail "launcher did not preserve the pen exit status"
failed_temporary_output="$(<"$failed_output_log")"
[[ ! -d "$(dirname "$failed_temporary_output")" ]] || fail "launcher left temporary data after pen failed"

set +e
env \
  PATH="$fake_bin:$PATH" \
  PEN_TEST_STATUS_EXIT=7 \
  "$launcher" > "$test_dir/preflight-stdout.log" 2> "$test_dir/preflight-stderr.log"
preflight_status=$?
set -e

[[ "$preflight_status" -eq 2 ]] || fail "launcher did not convert a failed preflight into a blocker"
grep -q 'Blocked: pen.dev CLI is not ready' "$test_dir/preflight-stderr.log" || fail "launcher did not explain the failed preflight"

printf 'PASS: read-only launcher preserves arguments, PTY, unique outputs, exit status, cleanup, and preflight blockers\n'
