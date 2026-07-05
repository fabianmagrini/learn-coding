import { eveChannel } from "eve/channels/eve";
import { localDev, placeholderAuth, vercelOidc } from "eve/channels/auth";

// The built-in HTTP channel. It's what the local dev TUI and the HTTP API talk
// to, so you can drive the whole agent from a terminal before wiring up GitHub.
export default eveChannel({
  auth: [
    // Lets the eve TUI and your Vercel deployments reach the deployed agent.
    vercelOidc(),
    // Open on localhost for `eve dev` and the REPL; ignored in production.
    localDev(),
    // Placeholder: does NOT allow browser requests in production. Replace with
    // your app's auth provider (Auth.js, Clerk, ...) or use none() for a public demo.
    placeholderAuth(),
  ],
});
