/**
 * `devfoundry agent run` — run any agent with a task description.
 *
 * Example:
 *   devfoundry agent run --task "refactor user service" --repo myapp --agent refactor
 */

import { Command, Flags } from '@oclif/core';
import { getApiClient } from '../../lib/api-client.js';
import { header, success, error, info, table, statusBadge } from '../../lib/output.js';

const VALID_AGENTS = ['feature', 'test', 'refactor', 'security', 'dependency', 'pr-reviewer'];

export default class AgentRun extends Command {
  static override description = 'Run an AI agent with a specific task';

  static override examples = [
    `<%= config.bin %> agent run --task "implement rate limiting on payments API" --repo myapp`,
    `<%= config.bin %> agent run --task "refactor user service" --repo myapp --agent refactor`,
    `<%= config.bin %> agent run --task "audit auth module" --repo myapp --agent security`,
  ];

  static override flags = {
    task: Flags.string({
      char: 't',
      description: 'Task description for the agent',
      required: true,
    }),
    repo: Flags.string({
      char: 'r',
      description: 'Target repository name',
      required: true,
    }),
    agent: Flags.string({
      char: 'a',
      description: `Agent type (${VALID_AGENTS.join(', ')})`,
      default: 'feature',
      options: VALID_AGENTS,
    }),
    context: Flags.string({
      char: 'c',
      description: 'Additional context',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(AgentRun);

    header('DevFoundry — Agent Run');
    info(`Agent: ${flags.agent}`);
    info(`Task: "${flags.task}"`);
    info(`Repository: ${flags.repo}`);

    const client = getApiClient();

    try {
      const run = await client.runAgent({
        agentType: flags.agent,
        task: flags.task,
        repo: flags.repo,
        context: flags.context,
      });

      this.log('');

      if (run.status === 'completed') {
        success('Agent completed successfully');
        table([
          ['Run ID', run.id],
          ['Agent', run.agentType],
          ['Status', statusBadge(run.status)],
          ['Duration', `${run.durationMs ?? 0}ms`],
          ['Summary', run.summary ?? 'N/A'],
        ]);
      } else if (run.status === 'failed') {
        error(`Agent failed: ${run.error ?? 'Unknown error'}`);
        this.exit(1);
      } else {
        info(`Queued run ID: ${run.id}`);
      }
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      this.exit(1);
    }
  }
}
