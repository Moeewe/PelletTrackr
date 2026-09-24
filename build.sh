#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
node scripts/build.mjs
