#!/usr/bin/env bash
set -euo pipefail

out="$(cd "${1:-$HOME/Downloads}" && pwd)"
cherri="${CHERRI:-$HOME/go/bin/cherri}"
cd "$(dirname "$0")"

printf 'const version = "%s"\n' "$(git describe --always --dirty)" > version.cherri

for name in Add Delete; do
  src="$(echo "$name" | tr '[:upper:]' '[:lower:]')"
  "$cherri" "$src.cherri" --skip-sign
  # Signing into the repo fails when it lives on an external volume, since `shortcuts` is sandboxed.
  shortcuts sign --mode anyone --input "${src}_unsigned.shortcut" --output "$out/Photochron - $name.shortcut"
  rm "${src}_unsigned.shortcut"
  echo "Built $out/Photochron - $name.shortcut"
done
