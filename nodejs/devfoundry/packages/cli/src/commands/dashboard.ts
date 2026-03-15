/**
 * `devfoundry dashboard` — opens the web dashboard in the default browser.
 */

import { Command } from '@oclif/core';
import { exec } from 'child_process';
import { header, info, error, success } from '../lib/output.js';

export default class Dashboard extends Command {
  static override description = 'Open the DevFoundry web dashboard in the browser';

  static override examples = [`<%= config.bin %> dashboard`];

  async run(): Promise<void> {
    const webUrl = process.env['DEVFOUNDRY_WEB_URL'] ?? 'http://localhost:5173';

    header('DevFoundry — Dashboard');
    info(`Opening dashboard at: ${webUrl}`);

    const openCommand =
      process.platform === 'darwin'
        ? `open "${webUrl}"`
        : process.platform === 'win32'
          ? `start "${webUrl}"`
          : `xdg-open "${webUrl}"`;

    exec(openCommand, (err) => {
      if (err) {
        error(`Could not open browser automatically. Visit: ${webUrl}`);
      } else {
        success(`Dashboard opened in your browser`);
      }
    });
  }
}
