#!/usr/bin/env bash
set -euo pipefail

read -rp 'Domain: ' domain
read -rp 'Access client ID: ' client_id
read -rsp 'Access client secret: ' client_secret
echo

host=$(printf '%s' "$domain" | tr '[:upper:]' '[:lower:]')
host="${host#http://}"
host="${host#https://}"
while [[ $host == */ ]]; do host="${host%/}"; done
if [[ ! $host =~ ^[a-z0-9.-]+$ ]]; then
  echo 'Domain must be a bare host such as photos.example.com' >&2
  exit 1
fi
domain="https://$host"

for value in "$client_id" "$client_secret"; do
  if [[ ! $value =~ ^[A-Za-z0-9._:/-]+$ ]]; then
    echo 'Values may only contain letters, digits, and . _ : / -' >&2
    exit 1
  fi
done

json=$(printf '{"domain":"%s","CF-Access-Client-Id":"%s","CF-Access-Client-Secret":"%s"}' \
  "$domain" "$client_id" "$client_secret")
code="photochron:$(printf '%s' "$json" | base64 | tr -d '\n')"

if command -v pbcopy >/dev/null && printf '%s' "$code" | pbcopy 2>/dev/null; then
  echo 'Setup code copied to the clipboard.'
else
  echo "$code"
fi
