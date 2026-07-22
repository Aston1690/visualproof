import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, stat } from 'node:fs/promises';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';

const execFileAsync = promisify(execFile);

test('CLI audits a local HTML file and writes a complete report', async () => {
  const output = await mkdtemp(path.join(tmpdir(), 'visualproof-cli-'));
  const fixture = path.resolve('examples/demo/index.html');
  const { stdout } = await execFileAsync(process.execPath, ['src/cli.js', 'audit', fixture, '--output', output], {
    cwd: path.resolve('.'),
    timeout: 30000
  });

  assert.match(stdout, /Audit complete/);
  await stat(path.join(output, 'index.html'));
  await stat(path.join(output, 'report.json'));
  await stat(path.join(output, 'screenshots/desktop.png'));
  await stat(path.join(output, 'screenshots/mobile.png'));
});
