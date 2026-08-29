#!/usr/bin/env sh
# ============================================================
# FILE: run-local.sh
# PURPOSE: Provides the Unix-like shell launcher that forwards local commands to Internet Time Machine's Node.js entry point.
# ============================================================

set -eu
node scripts/run-local.mjs dev "$@"
