# Văn Phòng AI

Vietnamese 3D AI office prototype. Node.js >=24; React 19; React Three Fiber 9; Vite; Express; built-in SQLite.

- Work in the existing checkout; do not create a worktree unless requested.
- Read `.agents/skills/office-3d/SKILL.md` for scene work and `.agents/skills/agent-orchestration/SKILL.md` for agent/backend work.
- `npm ci`, `npm run dev`, `npm run build`, `npm test`.
- Keep API credentials server-only. Never expose credentials via `VITE_` variables or commit `.env` / `.data`.
- Demo is deterministic simulation, never claim it used AI. Default real provider is Codex CLI (`AI_PROVIDER=codex`) with server-side CLI login. `AI_PROVIDER=openai` uses `AI_API_KEY`; `demo` is explicit simulation.
- Agent execution is sequential: manager → analyst → writer. Codex subprocesses run in temporary working directories with read-only sandbox, no approvals, and shell tools disabled; the office workflow is text-only. Never use sandbox/approval bypass flags.
- Run build and relevant tests before handing off. Changes to API/state need tests for errors as well as success.
- This is a trusted local development prototype without authentication. Production access requires a separate security/deployment task.
