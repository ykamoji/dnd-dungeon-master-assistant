#!/usr/bin/env bash
# Run egress.py using the project's uv-created virtual environment.
# Any arguments passed to this script are forwarded to egress.py
# (e.g. ./run_egress.sh --dry-run).
set -euo pipefail

# Resolve the directory this script lives in, so it works from anywhere
# (and tolerates the space in the folder name).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

VENV_PYTHON="$SCRIPT_DIR/.venv/bin/python"
if [[ ! -x "$VENV_PYTHON" ]]; then
    echo "[error] virtual environment not found at $SCRIPT_DIR/.venv" >&2
    echo "        create it first with: uv sync" >&2
    exit 1
fi

# Activate the venv, run the script, then deactivate it on completion
# (even if the script fails) and exit with the script's status.
# Invoke the venv's python by absolute path rather than relying on PATH, so a
# renamed/moved folder can't silently fall back to a system interpreter.
source "$SCRIPT_DIR/.venv/bin/activate"

status=0
"$VENV_PYTHON" "$SCRIPT_DIR/egress.py" "$@" || status=$?

deactivate
exit "$status"
