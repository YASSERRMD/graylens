# AGENTS.md

## Git workflow (MANDATORY - applies to every change)

- One branch per phase. Branch name: `phase-NN-short-slug` (e.g. `phase-01-scaffold`).
- NEVER commit or push directly to `main`.
- One atomic commit per logical unit of work. Keep each commit to a single concern (3-15 minutes of work). Do not batch unrelated changes.
- After EVERY commit, immediately push that single commit to the remote branch. One commit, one push. Do not let commits pile up locally.
- Use Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`, `build:`, `style:`.
- Commit message subject under 72 chars, imperative mood, no trailing period.
- NEVER use the em dash character anywhere in code, comments, commit messages, or docs.
- Git identity is already configured globally as YASSERRMD / arafath.yasser@gmail.com. Do not change it.
- At the end of each phase, open a pull request from the phase branch into `main`, wait for it to be merged, then branch the next phase off updated `main`.

## Code conventions

- TypeScript strict mode on. No `any` unless justified in a comment.
- Prefer small, single-responsibility modules.
- Keep WebGPU device/adapter setup isolated from shader logic.
- Write the WGSL shaders in separate `.wgsl` files, imported as raw strings.
- Use "explore" or "investigate" in prose, never "experience".

Why this matters with opencode: by default opencode batches work and the agent may push several commits at once. The instruction above forces the one-commit-one-push cadence you want. Each phase prompt also restates the push rule as a hard guardrail.
