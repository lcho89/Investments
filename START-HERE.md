# After a reboot

Everything below survives a restart: the Paperclip database, your agents,
rclone's Drive authorisation, git config, and the installed CLIs. The only
thing that stops is the **server** — start it again and you are back.

## 1. Open Ubuntu

Start menu → **Ubuntu**. The prompt should look like:

```
lechernho@LCHO-X1-Carbon:~$
```

If it looks like `PS C:\Users\leche>` you are in PowerShell — type `wsl` and
press Enter.

## 2. Start the server (Terminal 1)

```bash
cd ~/Investments
bash scripts/start.sh
```

Wait for the Paperclip banner. **Leave this window open** — closing it stops
the server and any scheduled routines.

## 3. Open a second Ubuntu window (Terminal 2)

In Windows Terminal use the `⌄` next to the tabs → Ubuntu. Or launch Ubuntu
from the Start menu again. This is where you run everything else.

```bash
cd ~/Investments
git pull
```

## 4. Open the board

<http://127.0.0.1:3100> in your normal Windows browser.

---

## Then, depending on what you are doing

**Refresh holdings after trading** (update the sheet first):
```bash
python3 scripts/refresh_holdings.py
git add portfolio/holdings.json && git commit -m "Refresh holdings" && git push
```

**Apply changes to agents, models, budgets** (only needed after editing
`scripts/deploy.sh` or the plugin — instruction and skill edits need no redeploy):
```bash
bash scripts/deploy.sh
```

**Run the research cycle** — see `PROMPTS.md` for the prompts, `TESTING.md`
for the order and what to check.

**Tidy stray agent output:**
```bash
bash scripts/tidy.sh
```

---

## If something is broken

| Symptom | Fix |
|---|---|
| `localhost:3100` won't load | The server is not running. Do step 2. |
| `Command not found in PATH: "claude"` | Server started with a stale PATH. Ctrl+C in Terminal 1 and re-run step 2. |
| Agent runs fail in ~3 seconds | Infrastructure, not the agent. Check the error text before changing prompts. |
| `rclone` asks to reconnect | `rclone config reconnect gdrive:` |
| Git asks who you are | `git config --global user.email "you@example.com"` and `user.name` |

Logs: `~/.paperclip/instances/default/logs/server.log`
