#!/usr/bin/env bash
# Start the Paperclip server. Run this after every reboot.
# Leave this terminal open — closing it stops the server and all scheduled routines.
set -euo pipefail
export PATH="$HOME/.npm-global/bin:$PATH"
echo "Starting Paperclip — UI at http://127.0.0.1:3100"
echo "Leave this window open. Ctrl+C stops the server."
exec npx -y paperclipai run
