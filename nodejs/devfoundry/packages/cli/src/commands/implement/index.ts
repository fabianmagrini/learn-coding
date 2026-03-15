/**
 * `devfoundry implement` — triggers the FeatureAgent to implement a described feature.
 *
 * Example:
 *   devfoundry implement --description "add rate limiting to payments API" --repo myapp
 */

import { Command, Flags } from '@oclif/core';
import { getApiClient } from '../../lib/api-client.js';
import { header, success, error, info, table, statusBadge } from '../../lib/output.js';

export default class Implement extends Command {
  static override description = 'Trigger the FeatureAgent to implement a feature from a description';

  static override examples = [
    `<%= config.bin %> implement --description "add rate limiting to payments API" --repo myapp`,
    `<%= config.bin %> implement -d "implement user notifications" -r myapp`,
  ];

  static override flags = {
    description: Flags.string({
      char: 'd',
      description: 'Feature description / developer intent',
      required: true,
    }),
    repo: Flags.string({
      char: 'r',
      description: 'Target repository name',
      required: true,
    }),
    context: Flags.string({
      char: 'c',
      description: 'Additional context (e.g. existing code)',
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Implement);

    header('DevFoundry — Implement Feature');
    info(`Starting FeatureAgent for: "${flags.description}"`);
    info(`Repository: ${flags.repo}`);

    const client = getApiClient();

    try {
      const run = await client.runAgent({
        agentType: 'feature',
        task: flags.description,
        repo: flags.repo,
        context: flags.context,
      });

      if (run.status === 'completed') {
        success('FeatureAgent completed successfully');
        this.log('');
        table([
          ['Run ID', run.id],
          ['Status', statusBadge(run.status)],
          ['Duration', `${run.durationMs ?? 0}ms`],
          ['Summary', run.summary ?? 'N/A'],
        ]);
      } else if (run.status === 'failed') {
        error(`FeatureAgent failed: ${run.error ?? 'Unknown error'}`);
        this.exit(1);
      } else {
        info(`Agent run queued with ID: ${run.id}`);
        info('Use `devfoundry status` to check progress.');
      }
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      this.exit(1);
    }
  }
}
