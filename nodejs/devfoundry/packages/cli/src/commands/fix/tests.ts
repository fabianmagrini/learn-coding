/**
 * `devfoundry fix tests` — triggers TestAgent to fix or generate tests.
 *
 * Example:
 *   devfoundry fix tests --repo myapp
 */

import { Command, Flags } from '@oclif/core';
import { getApiClient } from '../../lib/api-client.js';
import { header, success, error, info, table, statusBadge } from '../../lib/output.js';

export default class FixTests extends Command {
  static override description = 'Trigger the TestAgent to generate or fix tests in a repository';

  static override examples = [
    `<%= config.bin %> fix tests --repo myapp`,
    `<%= config.bin %> fix tests --repo myapp --focus "UserService unit tests"`,
  ];

  static override flags = {
    repo: Flags.string({
      char: 'r',
      description: 'Target repository name',
      required: true,
    }),
    focus: Flags.string({
      char: 'f',
      description: 'Specific area to focus on (optional)',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(FixTests);

    const task = flags.focus
      ? `Fix and improve tests for ${flags.focus} in repository ${flags.repo}`
      : `Generate comprehensive tests for all untested modules in repository ${flags.repo}`;

    header('DevFoundry — Fix Tests');
    info(`Starting TestAgent for: ${flags.repo}`);
    if (flags.focus) info(`Focus: ${flags.focus}`);

    const client = getApiClient();

    try {
      const run = await client.runAgent({
        agentType: 'test',
        task,
        repo: flags.repo,
      });

      this.log('');

      if (run.status === 'completed') {
        success('TestAgent completed successfully');
        table([
          ['Run ID', run.id],
          ['Status', statusBadge(run.status)],
          ['Duration', `${run.durationMs ?? 0}ms`],
          ['Summary', run.summary ?? 'N/A'],
        ]);
      } else if (run.status === 'failed') {
        error(`TestAgent failed: ${run.error ?? 'Unknown error'}`);
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
