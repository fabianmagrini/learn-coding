import { defineTool } from "eve/tools";
import { never } from "eve/tools/approval";
import { z } from "zod";

// Paths that warrant extra scrutiny regardless of diff size.
const SENSITIVE = [
  /(^|\/)migrations?\//i,
  /schema\.(prisma|sql|graphql)$/i,
  /Dockerfile/i,
  /\.github\/workflows\//i,
  /(^|\/)(auth|authz|session|login)/i,
  /(billing|payment|charge|invoice)/i,
  /(secret|credential|token|password)/i,
  /package(-lock)?\.json$/i,
];

export default defineTool({
  approval: never(),
  description:
    "Score the risk of a pull request from its diff stats and changed file paths. " +
    "Returns a risk level (low | medium | high) with reasons so the review can " +
    "prioritize scrutiny. Call this before writing the triage summary.",
  inputSchema: z.object({
    additions: z.number().int().nonnegative().describe("Lines added across the PR."),
    deletions: z.number().int().nonnegative().describe("Lines removed across the PR."),
    changedFiles: z.array(z.string()).describe("Paths of every changed file in the PR."),
  }),
  async execute({ additions, deletions, changedFiles }) {
    const reasons: string[] = [];
    const sensitiveFiles = changedFiles.filter((f) => SENSITIVE.some((re) => re.test(f)));
    if (sensitiveFiles.length) {
      reasons.push(`Touches sensitive paths: ${sensitiveFiles.join(", ")}.`);
    }

    const churn = additions + deletions;
    if (churn > 800) reasons.push(`Large diff (${churn} lines changed).`);
    else if (churn > 300) reasons.push(`Sizeable diff (${churn} lines changed).`);

    if (changedFiles.length > 25) reasons.push(`Spans ${changedFiles.length} files.`);

    let level: "low" | "medium" | "high" = "low";
    if (sensitiveFiles.length || churn > 800) level = "high";
    else if (churn > 300 || changedFiles.length > 25) level = "medium";

    if (!reasons.length) reasons.push("Small, contained change with no sensitive paths.");

    return { level, reasons, churn, fileCount: changedFiles.length, sensitiveFiles };
  },
  // The model only needs the verdict; the channel/hooks still get the full object.
  toModelOutput(o) {
    return { type: "text", value: `Risk: ${o.level.toUpperCase()} — ${o.reasons.join(" ")}` };
  },
});
