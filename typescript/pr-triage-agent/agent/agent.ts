import { defineAgent } from "eve";

export default defineAgent({
  // Claude is eve's default model, routed through the Vercel AI Gateway.
  // Swap to `anthropic("claude-...")` from @ai-sdk/anthropic to call the API directly.
  model: "anthropic/claude-sonnet-5",
});
