/**
 * `devfoundry policy check` — evaluates governance policy on a PR.
 *
 * Example:
 *   devfoundry policy check --pr 142
 */

import { Command, Flags } from '@oclif/core';
import { getApiClient } from '../../lib/api-client.js';
import { header, success, error, warn, info, table, riskBadge } from '../../lib/output.js';

export default class PolicyCheck extends Command {
  static override description = 'Evaluate governance policy on a pull request';

  static override examples = [
    `<%= config.bin %> policy check --pr 142`,
    `<%= config.bin %> policy check --pr abc-uuid-here`,
  ];

  static override flags = {
    pr: Flags.string({
      description: 'PR ID or number to check',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(PolicyCheck);

    header('DevFoundry — Policy Check');
    info(`Checking policy for PR: ${flags.pr}`);

    const client = getApiClient();

    try {
      const result = await client.checkPolicy(flags.pr);

      this.log('');
      table([
        ['PR ID', flags.pr],
        ['Risk Tier', riskBadge(result.tier)],
        ['Policy Status', result.passed ? '\x1b[32mPASSED\x1b[0m' : '\x1b[31mFAILED\x1b[0m'],
        ['Recommended Action', result.action],
      ]);

      if (result.violations && result.violations.length > 0) {
        this.log('\nPolicy Violations:');
        for (const violation of result.violations) {
          const icon = violation.severity === 'error' ? '\x1b[31m✗\x1b[0m' : '\x1b[33m⚠\x1b[0m';
          this.log(`  ${icon} [${violation.rule}] ${violation.message}`);
        }
      } else {
        success('No policy violations found');
      }

      if (!result.passed) {
        error('Policy check failed — PR requires review before merge');
        this.exit(1);
      }
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      this.exit(1);
    }
  }
}
