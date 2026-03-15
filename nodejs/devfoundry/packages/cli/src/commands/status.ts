/**
 * `devfoundry status` — shows platform status and recent agent activity.
 */

import { Command } from '@oclif/core';
import { getApiClient } from '../lib/api-client.js';
import { header, success, error, info, table, statusBadge, riskBadge } from '../lib/output.js';

export default class Status extends Command {
  static override description = 'Show DevFoundry platform status and KPI metrics';

  static override examples = [`<%= config.bin %> status`];

  async run(): Promise<void> {
    header('DevFoundry — Platform Status');

    const client = getApiClient();

    try {
      const metrics = await client.getDashboardMetrics();

      success('API connected and healthy');
      this.log('');
      this.log('\x1b[1mKey Metrics:\x1b[0m');
      table([
        ['AI PR Acceptance Rate', `${metrics['aiPrAcceptanceRate'] ?? 'N/A'}%`],
        ['Deploy Frequency', `${metrics['deployFrequency'] ?? 'N/A'}/day`],
        ['Lead Time', `${metrics['leadTimeHours'] ?? 'N/A'}h`],
        ['Active Agents', String(metrics['activeAgents'] ?? 6)],
        ['Architecture Violations', String(metrics['architectureViolations'] ?? 0)],
        ['Total Agent Runs', String(metrics['totalAgentRuns'] ?? 0)],
      ]);

      this.log('');
      info('Run `devfoundry dashboard` to open the full web dashboard.');
    } catch (err) {
      error(
        err instanceof Error
          ? err.message
          : 'Cannot reach DevFoundry API. Is the server running?',
      );
      info('Start the API with: cd packages/api && pnpm dev');
      this.exit(1);
    }
  }
}
