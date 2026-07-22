import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, stat, symlink } from 'node:fs/promises';
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
  const reportPath = path.join(output, 'report.json');
  await stat(reportPath);
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  assert.equal(report.results.length, 2);
  for (const result of report.results) {
    assert.match(result.screenshot, new RegExp(`^screenshots/${result.name}-[a-f0-9-]+\\.png$`));
    await stat(path.join(output, result.screenshot));
  }
});

test('importing the CLI module does not execute it', async () => {
  const cliUrl = new URL('../src/cli.js', import.meta.url).href;
  const script = `process.argv = ['node', 'host', 'audit', 'https://example.com']; await import(${JSON.stringify(cliUrl)}); console.log('imported');`;
  const { stdout, stderr } = await execFileAsync(process.execPath, ['--input-type=module', '--eval', script], {
    cwd: path.resolve('.'),
    timeout: 10000
  });

  assert.equal(stdout, 'imported\n');
  assert.equal(stderr, '');
});

test('CLI executes correctly through an npm-style symlink', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'visualproof-bin-'));
  const bin = path.join(root, 'visualproof');
  await symlink(path.resolve('src/cli.js'), bin);

  const { stdout, stderr } = await execFileAsync(bin, ['--version'], { timeout: 10000 });
  assert.equal(stdout, '0.1.1\n');
  assert.equal(stderr, '');
});
