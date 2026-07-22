import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
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
  const files = await writeReport(audit, output);
  assert.equal(path.basename(files.json), 'report.json');
  assert.equal(path.basename(files.html), 'index.html');
  assert.deepEqual(JSON.parse(await readFile(files.json, 'utf8')), audit);
  assert.match(await readFile(files.html, 'utf8'), /VisualProof/);
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
