import { defineTool } from "eve/tools";
import { never } from "eve/tools/approval";
import { z } from "zod";
import { gh } from "../lib/github.js";

export default defineTool({
  // Additive and reversible, so no human gate.
  approval: never(),
  description:
    "Add labels to a pull request (additive — existing labels are kept). Use for " +
    "triage labels like `high-risk`, `needs-tests`, `size/L`, or `stale`.",
  inputSchema: z.object({
    owner: z.string().describe("Repository owner (user or org)."),
    repo: z.string().describe("Repository name."),
    prNumber: z.number().int().positive().describe("Pull request number."),
    labels: z.array(z.string()).min(1).describe("Labels to add."),
  }),
  async execute({ owner, repo, prNumber, labels }) {
    // A PR is an issue for the labels endpoint.
    await gh(`/repos/${owner}/${repo}/issues/${prNumber}/labels`, {
      method: "POST",
      body: { labels },
    });
    return { prNumber, labeled: labels };
  },
});
