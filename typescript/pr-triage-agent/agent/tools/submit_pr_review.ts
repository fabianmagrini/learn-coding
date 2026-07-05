import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { gh } from "../lib/github.js";

export default defineTool({
  // Blocking, outward-facing action: it changes the PR's merge state, so it
  // ALWAYS pauses for a human to approve before it runs. This is the
  // human-in-the-loop showcase — eve durably parks the session at this point.
  approval: always(),
  description:
    "Submit a formal pull request review that changes the PR's merge state: " +
    "APPROVE, REQUEST_CHANGES, or COMMENT. Requires human approval before it runs.",
  inputSchema: z.object({
    owner: z.string().describe("Repository owner (user or org)."),
    repo: z.string().describe("Repository name."),
    prNumber: z.number().int().positive().describe("Pull request number."),
    event: z.enum(["APPROVE", "REQUEST_CHANGES", "COMMENT"]),
    body: z.string().min(1).describe("The review summary shown on the PR."),
  }),
  async execute({ owner, repo, prNumber, event, body }) {
    const review = await gh<{ id: number; html_url: string }>(
      `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
      { method: "POST", body: { event, body } },
    );
    return { reviewId: review.id, url: review.html_url, event };
  },
});
