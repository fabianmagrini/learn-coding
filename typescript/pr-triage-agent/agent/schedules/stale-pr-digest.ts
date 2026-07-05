import { defineSchedule } from "eve/schedules";

const owner = process.env.DIGEST_OWNER ?? "your-org";
const repo = process.env.DIGEST_REPO ?? "your-repo";

// Task-mode schedule: fires on a cron cadence, runs the agent, discards output.
// The agent can still call tools along the way. On Vercel this becomes a Cron
// Job evaluated in UTC. `eve dev` never fires schedules — use the dispatch route
// to trigger one while iterating.
export default defineSchedule({
  cron: "0 9 * * 1-5", // 09:00 UTC on weekdays
  markdown:
    `List open pull requests in ${owner}/${repo} that have had no activity for ` +
    `at least 2 days using list_open_prs (staleDays: 2). For each one, add the ` +
    `"stale" label with set_pr_labels. If there are none, do nothing.`,
});
