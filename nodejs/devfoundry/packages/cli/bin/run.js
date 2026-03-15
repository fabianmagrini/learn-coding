#!/usr/bin/env node

const { execute, run, flush } = require('@oclif/core');

run(void 0, require('../package.json'))
  .then(flush)
  .catch((error) => {
    const { handle } = require('@oclif/core');
    handle(error);
  });
