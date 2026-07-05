import { defineTool } from "eve/tools";
import { never } from "eve/tools/approval";
import { z } from "zod";
import { gh } from "../lib/github.js";

interface RestPull {
  number: number;
  title: string;
  html_url: string;
  updated_at: string;
  draft: boolean;
  user: { login: string } | null;
}

export default defineTool({
  approval: never(),
  description:
    "List open pull requests in a repository, optionally only those with no " +
    "activity for at least `staleDays` days. Use for triage sweeps and digests.",
  inputSchema: z.object({
    owner: z.string().describe("Repository owner (user or org)."),
    repo: z.string().describe("Repository name."),
    staleDays: z
      .number()
      .int()
      .nonnegative()
      .default(0)
      .describe("Only return PRs untouched for at least this many days. 0 returns all open PRs."),
  }),
  async execute({ owner, repo, staleDays }) {
    const pulls = await gh<RestPull[]>(
      `/repos/${owner}/${repo}/pulls?state=open&sort=updated&direction=asc&per_page=50`,
    );
    const cutoff = Date.now() - staleDays * 86_400_000;
    const stale = pulls.filter(
      (p) => !p.draft && new Date(p.updated_at).getTime() <= cutoff,
    );
    return {
      count: stale.length,
      prs: stale.map((p) => ({
        number: p.number,
        title: p.title,
        author: p.user?.login ?? "unknown",
        url: p.html_url,
        updatedAt: p.updated_at,
      })),
    };
  },
});
