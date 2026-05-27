<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:commit-rules -->
# Commit Rules

- Always make commit message using real diff, do NOT trust the plan modified files
- First line is summary, then multiple lines as need to have a detailed message
- Never add yourself or any other IA agent as co-author
- This repo is on Windows/PowerShell. Do NOT use here-strings (`@'...'@`) for commit messages: the leading `@` leaks into the subject line. Instead pass `git commit -m '...'` with a single-quoted, multi-line string (PowerShell single quotes span newlines). Do not start any message line with `@`, `<`, or `>`.
<!-- END:commit-rules -->