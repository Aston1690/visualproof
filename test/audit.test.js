import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { auditTarget } from '../src/audit.js';

test('captures desktop and mobile screenshots with objective browser evidence', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'visualproof-browser-'));
  const fixture = path.join(root, 'fixture.html');
  await writeFile(fixture, `<!doctype html><html><head><title>Fixture</title><meta name="description" content="Test page"></head>
    <body><h1>Proof</h1><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt=""><button style="width:30px;height:30px">Go</button>
    <script>console.error('fixture failure')</script></body></html>`);
  const output = path.join(root, 'output');
  const audit = await auditTarget(pathToFileURL(fixture).href, output);

  assert.deepEqual(audit.results.map(({ name }) => name), ['desktop', 'mobile']);
  assert.equal(audit.results[0].evidence.title, 'Fixture');
  assert.equal(audit.results[0].evidence.h1Count, 1);
  assert.equal(audit.results[0].evidence.images.length, 1);
  assert.ok(audit.results[0].issues.some(({ rule }) => rule === 'console-errors'));
  assert.ok(audit.results[1].issues.some(({ rule }) => rule === 'touch-target'));
  await stat(path.join(output, audit.results[0].screenshot));
  await stat(path.join(output, audit.results[1].screenshot));
});

test('rejects unsafe viewport names before creating screenshot paths', async () => {
  const output = await mkdtemp(path.join(tmpdir(), 'visualproof-unsafe-'));
  await assert.rejects(
    auditTarget('https://example.com', output, {
      viewports: [{ name: '../escape', width: 390, height: 844 }]
    }),
    /safe name/
  );
});

test('rejects an empty viewport configuration', async () => {
  const output = await mkdtemp(path.join(tmpdir(), 'visualproof-empty-'));
  await assert.rejects(
    auditTarget('https://example.com', output, { viewports: [] }),
    /at least one viewport/
  );
});
