#!/usr/bin/env node

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { access } from 'node:fs/promises';
import { auditTarget } from './audit.js';
import { writeReport } from './report.js';

const HELP = `VisualProof — evidence-first visual QA

Usage:
  visualproof audit <url-or-file> [--output <directory>]
  visualproof --help
  visualproof --version
`;

function valueAfter(args, flag, fallback) {
  const index = args.indexOf(flag);
  if (index === -1) return fallback;
  if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`${flag} requires a value.`);
  return args[index + 1];
}

async function normalizeTarget(target) {
  if (/^https?:\/\//i.test(target) || target.startsWith('file:')) return target;
  const absolutePath = path.resolve(target);
  await access(absolutePath);
  return pathToFileURL(absolutePath).href;
}

export async function run(args = process.argv.slice(2)) {
  if (args.includes('--help') || args.length === 0) {
    console.log(HELP);
    return;
  }
  if (args.includes('--version')) {
    console.log('0.1.0');
    return;
  }
  if (args[0] !== 'audit' || !args[1] || args[1].startsWith('--')) {
    throw new Error(`Expected: visualproof audit <url-or-file>\n\n${HELP}`);
  }

  const target = await normalizeTarget(args[1]);
  const outputDir = path.resolve(valueAfter(args, '--output', 'visualproof-report'));
  const audit = await auditTarget(target, outputDir);
  const files = await writeReport(audit, outputDir);

  console.log(`Audit complete — ${audit.summary.grade} / ${audit.summary.score}`);
  console.log(`HTML: ${files.html}`);
  console.log(`JSON: ${files.json}`);
}

run().catch((error) => {
  console.error(`VisualProof failed: ${error.message}`);
  process.exitCode = 1;
});
