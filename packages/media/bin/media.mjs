#!/usr/bin/env node
/**
 * Thin launcher for `@tgmc/media` CLI (requires package build for dist/).
 */
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cliUrl = pathToFileURL(join(here, '../dist/cli.js')).href;
const { runCli } = await import(cliUrl);
const code = await runCli(process.argv.slice(2));
process.exit(code);
