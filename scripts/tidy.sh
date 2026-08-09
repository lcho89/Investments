#!/usr/bin/env bash
# Move stray agent output into the canonical layout.
# Agents sometimes ignore the path rules; this recovers the files rather than
# leaving them scattered. Safe to run any time.
set -euo pipefail
cd "$(dirname "$0")/.."

moved=0
for dir in research updates analysis notes; do
  [ -d "$dir" ] || continue
  while IFS= read -r f; do
    base=$(basename "$f")
    slug=$(echo "$base" | grep -oiE 'nuclear|commodit|energy|semis|tech|risk|cio|pm-[a-z]*' | head -1 | tr 'A-Z' 'a-z')
    slug=${slug:-unfiled}
    mkdir -p "reports/$slug"
    git mv "$f" "reports/$slug/$base" 2>/dev/null || mv "$f" "reports/$slug/$base"
    echo "  $f -> reports/$slug/$base"; moved=$((moved+1))
  done < <(find "$dir" -type f -name '*.md')
  rmdir "$dir" 2>/dev/null || true
done

# Stray reports written to portfolio/ (that folder is for holdings data only)
while IFS= read -r f; do
  base=$(basename "$f")
  slug=$(echo "$base" | grep -oiE 'nuclear|commodit|energy|semis|tech|risk|cio' | head -1 | tr 'A-Z' 'a-z')
  slug=${slug:-unfiled}; [ "$slug" = "commodit" ] && slug=commodities-analyst
  mkdir -p "reports/$slug"
  mv "$f" "reports/$slug/$base"; echo "  $f -> reports/$slug/$base"; moved=$((moved+1))
done < <(find portfolio -maxdepth 1 -type f -name '*.md' 2>/dev/null)

# Reports saved as reports/<agent>-<something>.md instead of reports/<agent>/<date>.md
while IFS= read -r f; do
  base=$(basename "$f" .md)
  agent=$(echo "$base" | grep -oE '^(pm-[a-z-]+|[a-z]+-analyst|cio)' || true)
  [ -z "$agent" ] && continue
  mkdir -p "reports/$agent"
  mv "$f" "reports/$agent/$base.md"; echo "  $f -> reports/$agent/$base.md"; moved=$((moved+1))
done < <(find reports -maxdepth 1 -type f -name '*-*.md')

echo "Tidied $moved file(s)."
