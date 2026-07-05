# PR Triage — an Eve demo agent

A GitHub **pull-request triage bot** built on [Eve](https://eve.dev), Vercel's
filesystem-first agent framework. Open a PR (or `@mention` the bot), and it:

1. scores the PR's risk from its diff,
2. runs a review checklist (loading a deeper security skill only when relevant),
3. posts a concise findings comment,
4. applies triage labels, and
5. can submit a formal **APPROVE / REQUEST_CHANGES** review — but only after a
   human approves that action.

It's designed to demo the parts of Eve that make it different from hand-rolled
agent plumbing. Every capability below is **one file** that Eve auto-discovers —
there is no registry to keep in sync.

## What it showcases

| Eve feature | Where it lives |
| --- | --- |
| Filesystem-first, auto-wired capabilities | everything under `agent/` |
| Claude as the model | `agent/agent.ts` (`anthropic/claude-sonnet-5`) |
| Typed tools with Zod schemas | `agent/tools/*.ts` |
| **Human-in-the-loop** approval gate | `submit_pr_review.ts` (`approval: always()`) |
| Progressive-disclosure skills (Markdown + packaged) | `agent/skills/` |
| Multi-channel deploy (GitHub App + built-in HTTP) | `agent/channels/*.ts` |
| Sandbox repo checkout + PR diff in context | `agent/channels/github.ts` |
| Scheduled autonomous runs (cron) | `agent/schedules/stale-pr-digest.ts` |

## Project layout

```
agent/
├── agent.ts                    # model + runtime config
├── instructions.md             # always-on system prompt
├── lib/github.ts               # shared REST helper (not a capability)
├── tools/
│   ├── assess_pr_risk.ts       # pure risk scorer  (approval: never)
│   ├── set_pr_labels.ts        # additive labels    (approval: never)
│   ├── submit_pr_review.ts     # blocking review    (approval: ALWAYS ← HITL)
│   └── list_open_prs.ts        # used by the schedule
├── skills/
│   ├── pr-review-checklist.md          # flat Markdown skill
│   └── security-review/                # packaged skill + references
│       ├── SKILL.md
│       └── references/owasp-quickref.md
├── channels/
│   ├── eve.ts                  # built-in HTTP channel (local TUI + API)
│   └── github.ts               # GitHub App webhooks
└── schedules/
    └── stale-pr-digest.ts      # nightly cron sweep
```

## Prerequisites

- Node 24+
- A model credential — `AI_GATEWAY_API_KEY`, or run `vercel link` for OIDC
- A `GITHUB_TOKEN` with `repo` scope (used by the tools)

## Run it locally

```bash
cd pr-triage-agent
cp .env.example .env      # fill in AI_GATEWAY_API_KEY and GITHUB_TOKEN
npm install
npm run dev               # opens Eve's terminal UI
```

> Prefer a guaranteed-fresh scaffold? Run `npx eve@latest init pr-triage-agent`
> first to generate a baseline project pinned to the latest Eve, then drop the
> `agent/` files from this repo on top. `npm install` here resolves the same deps.

In the dev TUI, drive the agent without needing GitHub webhooks — it talks to the
built-in HTTP channel. Try:

```
Triage PR #42 in vercel/next.js. Additions 640, deletions 30, changed files:
app/api/auth/route.ts, lib/session.ts, package.json. Then label it.
```

Watch the loop run in order: `assess_pr_risk` → `load_skill` (checklist, then
security) → the findings reply → `set_pr_labels`. Ask it to *request changes* and
you'll see the run **pause for approval** before `submit_pr_review` executes —
that's Eve durably parking the session.

## Add a review rule live (the DX moment)

Drop a new file in `agent/skills/` and it's instantly part of the agent — no
wiring:

```bash
echo 'Use when a PR changes public API. Require a CHANGELOG entry and a migration note.' \
  > agent/skills/api-change-policy.md
```

The model now routes to it whenever a PR touches public API.

## Deploy for real GitHub events

1. Create a GitHub App; set its webhook URL to `https://<deployment>/eve/v1/github`
   and subscribe to `issue_comment`, `pull_request_review_comment`,
   `pull_request`, and `check_suite`.
2. Set `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`,
   `GITHUB_APP_SLUG`, and `GITHUB_TOKEN` in your Vercel project.
3. Deploy:
   ```bash
   VERCEL_USE_EXPERIMENTAL_FRAMEWORKS=1 vercel deploy --prod
   ```

Now open a PR in a repo the App is installed on and the bot triages it in-thread,
with the diff in context and the repo checked out into its sandbox.

## Suggested 5-minute demo script

1. **The pitch (30s)** — show the `agent/` tree. "Every file is a capability Eve
   auto-discovers. This is the whole agent."
2. **Local run (90s)** — `npm run dev`, paste the triage prompt, narrate the tool
   loop and the skill loading on demand.
3. **Human-in-the-loop (60s)** — ask it to request changes; the run pauses on
   `submit_pr_review`. Approve it. "Sensitive actions are gated by default, and
   the session survives the wait durably."
4. **Live extensibility (30s)** — add `api-change-policy.md`; re-run; it picks the
   new rule up with zero code changes.
5. **Production (60s)** — show `channels/github.ts` and `schedules/`. "Same agent
   brain: deploy it and it answers on real PRs and runs a nightly sweep on cron."

## Notes

- Tools run in the app runtime with full `process.env` — that's where the GitHub
  token is read. The sandbox (repo checkout) never sees it.
- `submit_pr_review` is the only gated tool. Labels and risk scoring run freely.
- The schedule targets `DIGEST_OWNER/DIGEST_REPO`; `eve dev` won't fire it on
  cadence — use Eve's dev dispatch route to trigger it once while iterating.
