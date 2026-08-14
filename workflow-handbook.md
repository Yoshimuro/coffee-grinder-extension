# Controlled Backend Workflow — Operator Handbook

Last updated: 2026-07-13 (post optimization batches 1+2).

This is the single-page **reference card** for the whole agentic pipeline: every agent, every command, every flag, every gate, and what the human does at each stop. It is deliberately NON-authoritative — when this page and a spec disagree, the spec wins. Authoritative homes:

| Concern | Authoritative file |
|---|---|
| Statuses, transitions, owners, safety invariants, profiles note | `.claude/workflows/status_transitions.md` |
| Per-agent gates, process, scope of writes | `.claude/agents/<agent>.md` |
| Handoff file catalogue | `.claude/workflows/agent_handoffs.md` |
| Rules (git, bash §16, contracts, dev, review, testing, docs, conventions) | `.claude/rules/*.md` |
| Change history + rationale | `.claude/workflow_changes/CHANGELOG.md` |
| One-page lifecycle maps | `.claude/workflows/controlled_backend_workflow.md`, `task_lifecycle.md` |

---

## 1. Big picture

One task = one ticket (`ULS-NNNN`) = one dossier at `docs/<TASK_ID>/` = one bd issue. Five gated phases, each owned by a dedicated forked agent, chained by an orchestrator. Every phase transition is written to `status.yaml` (the lifecycle SSOT) plus a handoff file. Agents communicate ONLY through files — no chat memory.

```
create → RESEARCH → [plan approval: USER] → DEVELOPMENT → REVIEW → TEST-PLANNING → (service docs) → [DONE: USER]
              ↑                                   │            │
              └── BLOCKED_BY_RESEARCH ←───────────┘            │
              └────────────── REVIEW_FAILED (rework loop) ←────┘
```

Human touchpoints in a normal run (everything else is autonomous):
1. `/task-create`, then `/task-research` with the ticket text.
2. Answer blocking questions (`/task-answer`) if research raises any.
3. Approve the plan (re-invoke `/task-pipeline` — the second invocation IS the approval).
4. Execute tests when the plan says so (agents never run your delivery; test-planning authors docs only).
5. Confirm delivery: `/task-done`.

## 2. Statuses (condensed)

Full table with owners and legal-next: `.claude/workflows/status_transitions.md`.

| Status | Owner | You see it when |
|---|---|---|
| `RESEARCH_IN_PROGRESS` | research-planning-agent | investigation running |
| `BLOCKED_BY_QUESTIONS` | research-planning-agent → you | ≥1 unresolved `gate: pre_dev` Q-N; answer via `/task-answer` |
| `READY_FOR_DEVELOPMENT` | you (plan approval) → development-agent | plan awaits your approval |
| `DEVELOPMENT_IN_PROGRESS` | development-agent | coding |
| `BLOCKED_BY_RESEARCH` | research-planning-agent | dev hit a hard rule (new contract, missing requirement, unclear compat/idempotency) |
| `READY_FOR_REVIEW` / `REVIEW_IN_PROGRESS` | review-agent | review running (incl. contract sub-pass when `contracts_touched: true`) |
| `REVIEW_FAILED` | development-agent (default) or research | must_fix findings; rework loop |
| `REVIEW_PASSED` → `READY_FOR_TESTING` | review-agent (transient pair, same run) | review passed |
| `TESTING_IN_PROGRESS` → `TESTING_READY` | test-planning-agent | test docs being authored / done |
| `TESTS_EXECUTED` | you (OPTIONAL) | you recorded run evidence in `testing/execution_evidence.md`; never required |
| `READY_FOR_SERVICE_DOCS` → `SERVICE_DOCS_IN_PROGRESS` → `SERVICE_DOCS_READY` | service-docs-agent | only when `service_docs_required: true` |
| `DONE` | you | terminal; set via `/task-done` |

Gate-typed questions: every `Q-N` carries `gate: pre_dev | pre_review | pre_testing | pre_docs | pre_done | none`. Only questions at-or-before the next phase block it; later-gate questions carry forward. No `gate:` field = `pre_dev` (pre-2026-06-07 compat).

## 3. Task profiles (2026-07-13)

`profile:` in `status.yaml`, decided at `/task-create`, default `standard`. Missing key (old tasks) = `standard`.

| Profile | Criteria | What slims down |
|---|---|---|
| `light` | 1 service, no contract change, no migration | one service folder; registry = single "no cross-service interaction" line; no contracts tree/examples/mirrors; review sub-pass `n/a`; single `testing/test_plan.md` instead of 4 testing docs |
| `standard` | everything else | examples + per-service mirrors only for contracts actually touched |
| `full` | multi-service OR contracts OR migration | full ceremony |

Escalation only upward (light→standard→full) when discovery contradicts the profile; downgrade requires explicit user approval. Contract touched on a `light` task = review `must_fix` + escalation to research.

## 4. Agents

### Lifecycle (on-graph, forked, gated)

| Agent | Model | Entry gate | Produces | Never |
|---|---|---|---|---|
| `research-planning-agent` | opus | fresh task / `BLOCKED_BY_*` re-entry | full dossier: requirements, research (caveman), scope plans (max 15 files/service, graphify-first), contracts, plan, risks, `research_to_dev` handoff | touches production code |
| `development-agent` | sonnet | `READY_FOR_DEVELOPMENT` (initial) or `REVIEW_FAILED` (iteration); `service_docs_required` strict boolean; entry self-check (quote-gate + verdict) | code + tests in `touched_services`, per-service docs, contract-sync self-check, dossier-ID grep self-check, sha256 snapshot, `dev_to_review` + `dev_to_testing` handoffs, `graphify update` | scope creep; undocumented contract changes (stops instead) |
| `review-agent` | sonnet | `READY_FOR_REVIEW` + `dev_to_review.md` with strict `contracts_touched:` boolean | 18-item checklist + 22-item contract sub-pass (when touched) + gate-typed Q-N hard-bounce; `review_report.md`; on pass promotes must_fix lessons to bd, sets `READY_FOR_TESTING`; on fail `review_to_dev.md` | editing code (unless user explicitly authorizes a specific edit in-turn) |
| `test-planning-agent` | sonnet | `READY_FOR_TESTING` (or user-authorized ADVISORY run — never touches status then) | 19-item coverage: `test_cases.md`, `contract_test_cases.md`, `regression_checklist.md`, `manual_checklist.md` (single `test_plan.md` on light), per-service test notes, semantic-parity cases | executing tests; writing `execution_evidence.md` (user-only) |
| `service-docs-agent` | sonnet | `READY_FOR_SERVICE_DOCS` (only when `service_docs_required: true`) | service-LOCAL API docs inside the service repo (may be Russian), `service_docs_to_done` handoff | referencing internal dossier / ticket IDs in service docs |

### Off-graph (housekeeping; never touch status.yaml lifecycle)

| Agent | Via | Does |
|---|---|---|
| `sync-agent` | `/task-sync <ID> [--apply]` | surfaces post-DONE drift vs snapshots; proposes memory sinks (decisions / dev_notes / bd / auto-memory); applies only on `--apply` |
| `task-mirror-agent` | `/task-mirror <ID>` | rewrites whitelisted dossier files to match CURRENT code (code = source of truth); cheap no-drift short-circuit |
| `task-summary-agent` | `/task-summary <ID> <research\|dev\|final>` | Russian stakeholder prose summary; never cites dossier internals |
| `task-qa-agent` | `/task-qa <ID>` | Russian QA-tester manual test-case export from testing docs (human-executable subset); source-mapped `QA-N (источник: TC/MC)`; gate `TESTING_READY`+; emits only if cases exist; never cites dossier internals |
| (orchestrated) | `/task-finalize <ID>` | gate `DONE`; git probe (informational) → ALWAYS mirror → ALWAYS summary `final` |

### Support

| Agent | Use |
|---|---|
| `arch-analyst` | ad-hoc architectural deep-dives; not in the gated lifecycle; has own agent-memory |
| `workflow-maintenance-agent` | ONLY via `/workflow-audit` (read-only) or `/workflow-change` (edits to `.claude/**`); never during normal tasks |
| `contract-review-agent` | DEPRECATED 2026-06-07; never invoke (historical reference in `agents/deprecated/`) |

## 5. Commands and flags

### Core lifecycle

| Command | Args / flags | What it does |
|---|---|---|
| `/task-create` | `<TASK_ID> <title>` | scaffold `docs/<ID>/` from template, decide `profile:`, init status.yaml, register bd issue (`bd create --id <ID>`), optional `bd dep add` blocks-edges |
| `/task-research` | `<ID> <description/context>` | fork research-planning-agent (bd-prime memories injected first) |
| `/task-answer` | `<ID>` + `Q-N: <answer>` lines | record answers verbatim into `decisions.md`, resolve Q-Ns, re-evaluate gate |
| `/task-dev` | `<ID>` | fork development-agent (initial or rework entry) |
| `/task-review` | `<ID>` | fork review-agent |
| `/task-testing` | `<ID>` | fork test-planning-agent (name kept for muscle memory; it PLANS tests, never runs them) |
| `/task-service-docs` | `<ID>` | fork service-docs-agent (only from `READY_FOR_SERVICE_DOCS`) |
| `/task-done` | `<ID>` | user-only `→ DONE` transitions with monotonic timestamp + bd close; refuses if service docs still owed |

All `/task-<phase>` skills are user-typed-only (`disable-model-invocation: true`); the main-session model cannot invoke them — that's what `/task-pipeline` is for.

### Orchestrators (main-session)

| Command | Args / flags | Behavior |
|---|---|---|
| `/task-pipeline` | `<ID>` | autonomous chain: read status → dispatch right agent → loop. Stops at: plan approval (first `READY_FOR_DEVELOPMENT` hit; re-invoke = approve), `BLOCKED_BY_QUESTIONS`, DONE-confirmation states, no-progress, unexpected transient states, 20-iteration cap. Auto-advances `TESTING_READY → READY_FOR_SERVICE_DOCS` when `service_docs_required: true`. Runs transition validator after each dispatch (soft). |
| `/task-pipeline` | `<ID> --overlap-testing` | same, plus: at `READY_FOR_REVIEW` dispatches review + ADVISORY test-planning in parallel; finalizes testing after review passes. Saves one serial phase on clean pass. |
| `/task-finalize` | `<ID>` | post-DONE chain: mirror → summary final. Cap 2, no loop. |

### Inspection / maintenance

| Command | Args | Does |
|---|---|---|
| `/task-status` | `<ID>` | full status readout: owner, Q-N gate table, allowed next actions, pending user transitions |
| `/task-next` | `<ID>` | one recommendation: next safe command or user transition |
| `/task-sync` | `<ID> [--apply]` | post-DONE drift retrospective (propose → apply) |
| `/task-mirror` | `<ID>` | code→dossier mirror (entry: DONE / SERVICE_DOCS_READY / TESTING_READY / TESTS_EXECUTED) |
| `/task-summary` | `<ID> research\|dev\|final` | Russian stakeholder summary (gates: RFD+ / RFR+ / DONE) |
| `/task-qa` | `<ID>` | Russian QA manual test-case export (gate: TESTING_READY+); off-graph, never edits status.yaml; emits only if human-executable cases exist |
| `/task-compress` | `<ID>` | caveman-compress ONLY `research.md` + `services/*/dev_notes.md` (hardcoded safe-list, `.original.md` backups) |
| `/task-trim-handoff` | `<ID> <handoff-file>` | archive older passes of a multi-pass handoff to `handoff/_archive/`, keep latest |
| `/remember-task` | `<insight> [--category <cat>] [--service <svc>] [--evidence <file:line>]` | store bd memory `[svc:..][cat:..][task:..]`; categories: concurrency, contracts, migration, security, idempotency, error-handling, observability, perf, convention |
| `/workflow-audit` | `[focus]` | read-only audit of `.claude/**` consistency |
| `/workflow-change` | `<request>` | plan/apply changes to `.claude/**` (the ONLY sanctioned way to modify the workflow) |

## 6. Handoffs (who writes what, when)

Catalogue + required front-matter: `.claude/workflows/agent_handoffs.md`. Quick map:

| File | Direction | When |
|---|---|---|
| `research_to_dev.md` | research → dev | plan approved, no pre_dev questions; delta re-entries append `## Plan sync` section |
| `dev_to_research.md` | dev → research | dev hard rule fired / gate refusal |
| `dev_to_review.md` | dev → review | implementation complete; strict `contracts_touched:` boolean |
| `dev_to_testing.md` | dev + review (joint) | created at dev completion, co-signed on review pass |
| `review_to_dev.md` | review → dev (or research) | must_fix findings; routing recommendation inside |
| `service_docs_to_done.md` | service-docs → user | docs complete |
| `files_snapshot_{dev,review,service_docs}.md` | each agent at completion | sha256 baselines for post-DONE drift detection; write-once, append per iteration |

Handoffs are append-only per direction; oversized multi-pass files → `/task-trim-handoff`.

## 7. Hooks and guards

| Hook | Event | Does |
|---|---|---|
| `bash-guard.sh` | PreToolUse (Bash) | allow/deny, NEVER ask. Tier 1 hard-deny: git mutations, `.git/` writes, recursive rm / sudo / chmod / dd / forkbomb / curl-pipe-shell, out-of-project absolute paths, package installs (npm/yarn/pnpm/pip), docker state mutations, kill/pkill/killall. Tier 2 deny-with-guidance: §16 shapes (redirection, cd-compound, pipe to head/tail/wc, `$(...)`, `<(...)`, heredoc). Tier 3: default allow. |
| `write-guard.sh` | PreToolUse (Write\|Edit) | confines writes to project root + session scratchpad + `/tmp` + auto-memory dir |
| `auto-advance.sh` | Stop | auxiliary one-shot nudge "invoke /task-pipeline" at forward gates; runs soft transition validator; closes bd on DONE; 30-min freshness gate |
| `bd-prime.sh` | called by skills/pipeline | injects service-tagged bd memories into agent briefs |
| `bd-sync.sh` | called on DONE | closes the bd issue |

Design intent: full-cycle runs are ZERO-permission-prompt. `permissions.allow` (32 entries) is documentation-of-intent; hooks are the effective policy. Lifecycle agents never use WebFetch/WebSearch (the last ask-path) — external-doc needs become Q-Ns. §16 command rules (no redirection, no cd-compound, no substitution/loops, Grep/Glob tools over shell search, no-cd absolute jest form): `.claude/rules/global_rules.md` §16.

Soft validator: `.claude/scripts/validate_status_transitions.py docs/<ID>/status.yaml` — checks legal (from,to), owner, ISO + monotonic timestamps. Timestamps everywhere: `date -u +%Y-%m-%dT%H:%M:%SZ`, written value = `max(now, last_ts + 1s)`.

## 8. bd (beads) layer

- One bd issue per task (ID mirrors ticket). Open while status ≠ DONE; auto-closed at DONE.
- Edges: `blocks`, `supersedes` only. `bd ready` = what's unblocked.
- Memories: `/remember-task` writes; `bd-prime.sh` surfaces per-service at agent start; review-agent auto-promotes resolved must_fix findings.
- Never `bd dolt push` without explicit instruction. bd missing = all steps skip silently.
- Trial status: threshold passed 2026-07-13 (18 memories / 6 tasks; criterion was 5+ at task 5) → continue through task 10 per `.claude/workflow_changes/bd_activation_steps.md`, then re-evaluate.

## 9. Caveman policy (files)

- Agents natively write caveman-full: `research.md`, `services/*/dev_notes.md`, end-of-run returns. Caveman JSDoc on internal helpers per dev-agent directive (marker `// jsdoc-style: caveman`).
- NEVER compressed: YAML/JSON, requirements, decisions, open_questions, risks, `contracts/**`, `handoff/**`, `review/**`, `testing/**`, structured per-service docs, templates.
- Retrofit tool: `/task-compress <ID>` (safe-list enforced, backups created).

## 10. Cheat-sheet: a task from start to finish

```
/task-create ULS-1200 "short title"          # scaffold + profile + bd issue
/task-research ULS-1200 <paste ticket text>  # research dossier
  ↳ BLOCKED_BY_QUESTIONS? → /task-answer ULS-1200  Q-1: ...  Q-2: ...
/task-pipeline ULS-1200                      # stops at plan gate
  (review docs/ULS-1200/implementation_plan.md)
/task-pipeline ULS-1200 [--overlap-testing]  # re-invoke = approve; runs dev→review→testing
  ↳ REVIEW_FAILED loops are automatic; pipeline stops only on human gates
(run the tests yourself per services/*/test_notes.md; optionally record
 testing/execution_evidence.md and transition to TESTS_EXECUTED)
/task-qa ULS-1200                            # export human-executable QA cases (RU) for the tester
/task-service-docs ULS-1200                  # only if pipeline stopped asking for it
/task-done ULS-1200                          # confirm delivery
# post-DONE, after manual edits:
/task-finalize ULS-1200                      # re-mirror dossier + regenerate RU summary
/task-sync ULS-1200 [--apply]                # optional lessons retrospective
```

Stuck / unsure: `/task-status <ID>` then `/task-next <ID>`.

## 11. Hard lines (never crossed by any agent)

1. Research before development; dev only from `READY_FOR_DEVELOPMENT` / `REVIEW_FAILED`.
2. Review before testing; testing docs never replace review.
3. Contract correctness verified inside review (sub-pass) when contracts touched.
4. Documentation-only agents never edit production code.
5. Service-local docs never reference the internal dossier or ticket keys.
6. Git: agents run ONLY `git status` / `git diff` (via `git -C`); all write-side git is yours, manually. No commits ever without explicit in-turn instruction.
7. `DONE` is user-confirmed, always.
8. No tests in `auth-api-v2`; `account_id` resolved from `user_id` server-side; `payment_methods.js` toggles via DB flags.
9. All `.claude/**` modifications go through `/workflow-change`; audits through `/workflow-audit`.
10. Full invariant list (authoritative, 10 items): `.claude/workflows/status_transitions.md` "Safety invariants".
