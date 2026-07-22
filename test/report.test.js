import test from 'node:test';
import assert from 'node:assert/strict';
import { lstat, mkdtemp, readFile, mkdir, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { renderReportHtml, writeReport } from '../src/report.js';

const audit = {
  tool: 'VisualProof', version: '0.1.0', url: 'https://example.com/?q=<unsafe>', auditedAt: '2026-07-22T12:00:00.000Z',
  summary: { score: 82, grade: 'B', issueCount: 1, viewports: 2 },
  results: [{ name: 'desktop', screenshot: 'screenshots/desktop.png', viewport: { width: 1440, height: 900 }, score: 82, grade: 'B',
    issues: [{ rule: 'image-alt', severity: 'medium', message: 'Missing <alt>.', evidence: '/hero.jpg' }], evidence: { title: 'Demo' } }]
};

test('renders a self-contained premium HTML report with escaped evidence', () => {
  const html = renderReportHtml(audit);
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /VisualProof/);
  assert.match(html, /data:image\/svg\+xml/);
  assert.match(html, /Missing &lt;alt&gt;\./);
  assert.doesNotMatch(html, /<script src=/);
});

test('writes matching JSON and HTML report files', async () => {
  const output = await mkdtemp(path.join(tmpdir(), 'visualproof-report-'));
  await mkdir(path.join(output, 'screenshots'));
  await writeFile(path.join(output, 'screenshots/desktop.png'), Buffer.from('89504e470d0a1a0a', 'hex'));
  const files = await writeReport(audit, output);
  assert.equal(path.basename(files.json), 'report.json');
  assert.equal(path.basename(files.html), 'index.html');
  assert.deepEqual(JSON.parse(await readFile(files.json, 'utf8')), audit);
  const html = await readFile(files.html, 'utf8');
  assert.match(html, /VisualProof/);
  assert.match(html, /src="data:image\/png;base64,/);
  assert.doesNotMatch(html, /src="screenshots\/desktop\.png"/);
});

test('sanitizes every report field and rejects unsafe screenshot URLs', () => {
  const malicious = structuredClone(audit);
  malicious.summary = {
    score: '<img src=x onerror=alert(1)>',
    grade: '<svg onload=alert(1)>',
    issueCount: '<script>alert(1)</script>',
    viewports: '2 onclick=alert(1)'
  };
  malicious.results[0].name = '<img src=x onerror=alert(1)>';
  malicious.results[0].grade = '<svg onload=alert(1)>';
  malicious.results[0].score = '<script>alert(1)</script>';
  malicious.results[0].viewport = { width: '<img src=x>', height: '900 onclick=alert(1)' };
  malicious.results[0].screenshot = 'javascript:alert(1)';

  const html = renderReportHtml(malicious);
  assert.doesNotMatch(html, /<script>alert|<svg onload|<img src=x|javascript:/);
  assert.match(html, /&lt;svg onload=alert\(1\)&gt;/);
});

test('refuses to embed screenshot symlinks that can expose outside files', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'visualproof-report-symlink-'));
  const output = path.join(root, 'output');
  const outside = path.join(root, 'outside.png');
  await mkdir(path.join(output, 'screenshots'), { recursive: true });
  await writeFile(outside, 'private file');
  await symlink(outside, path.join(output, 'screenshots/desktop.png'));

  await assert.rejects(writeReport(audit, output), /symbolic link/);
});

test('atomically replaces report output symlinks without overwriting their targets', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'visualproof-output-symlink-'));
  const output = path.join(root, 'output');
  const outsideJson = path.join(root, 'outside.json');
  const outsideHtml = path.join(root, 'outside.html');
  await mkdir(path.join(output, 'screenshots'), { recursive: true });
  await writeFile(path.join(output, 'screenshots/desktop.png'), Buffer.from('89504e470d0a1a0a', 'hex'));
  await writeFile(outsideJson, 'keep json');
  await writeFile(outsideHtml, 'keep html');
  await symlink(outsideJson, path.join(output, 'report.json'));
  await symlink(outsideHtml, path.join(output, 'index.html'));

  await writeReport(audit, output);

  assert.equal(await readFile(outsideJson, 'utf8'), 'keep json');
  assert.equal(await readFile(outsideHtml, 'utf8'), 'keep html');
  assert.equal((await lstat(path.join(output, 'report.json'))).isSymbolicLink(), false);
  assert.equal((await lstat(path.join(output, 'index.html'))).isSymbolicLink(), false);
});
