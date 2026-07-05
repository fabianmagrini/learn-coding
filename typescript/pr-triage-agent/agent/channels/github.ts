import { defaultGitHubAuth, githubChannel } from "eve/channels/github";

// Takes GitHub App webhooks at /eve/v1/github. The channel checks the signature,
// derives auth from whoever triggered the event, drops the PR diff into context,
// checks the repo out into the sandbox, and posts the agent's reply as a comment.
//
// Credentials come from env by default (GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY /
// GITHUB_WEBHOOK_SECRET), so no `credentials` block is needed here.
export default githubChannel({
  botName: process.env.GITHUB_APP_SLUG ?? "pr-triage",

  // Reply whenever someone @mentions the bot on an issue, PR, or review thread.
  onComment: (ctx) => ({ auth: defaultGitHubAuth(ctx) }),

  // Triage automatically the moment a PR is opened or marked ready for review.
  onPullRequest: (ctx, pr) =>
    pr.action === "opened" || pr.action === "ready_for_review"
      ? {
          auth: defaultGitHubAuth(ctx),
          context: [
            "Triage this pull request: assess risk, run the review checklist, " +
              "comment your findings, and apply labels.",
          ],
        }
      : null,

  // When CI fails on a PR, jump in and help triage the failure.
  onCheckSuite: (ctx, suite) =>
    suite.action === "completed" &&
    suite.conclusion === "failure" &&
    suite.app.slug === "github-actions" &&
    suite.pullRequests.length > 0
      ? {
          auth: defaultGitHubAuth(ctx),
          context: [
            `CI failed at ${suite.headSha}. Look at the failing checks and the ` +
              "diff, then comment the likely causes with file references.",
          ],
        }
      : null,
});
