import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSnapshot } from '../src/core.js';

test('flags a missing page title and deducts from the score', () => {
  const result = evaluateSnapshot({
    title: '',
    metaDescription: 'A useful description',
    h1Count: 1,
    images: [],
    interactive: [],
    overflowPx: 0,
    consoleErrors: [],
    largestHeadingPx: 48,
    viewport: { width: 1440, height: 900 }
  });

  assert.equal(result.score, 88);
  assert.equal(result.grade, 'B');
  assert.deepEqual(result.issues[0], {
    rule: 'document-title',
    severity: 'high',
    message: 'Page title is missing.',
    evidence: 'document.title is empty'
  });
});

test('flags a missing meta description', () => {
  const result = evaluateSnapshot({
    title: 'VisualProof demo', metaDescription: '', h1Count: 1, images: [], interactive: [],
    overflowPx: 0, consoleErrors: [], largestHeadingPx: 48,
    viewport: { width: 1440, height: 900 }
  });

  assert.equal(result.score, 94);
  assert.equal(result.issues[0].rule, 'meta-description');
  assert.equal(result.issues[0].severity, 'medium');
});

test('truncates long image sources in report evidence', () => {
  const result = evaluateSnapshot({
    title: 'Page', metaDescription: 'Description', h1Count: 1,
    images: [{ alt: '', src: `data:image/svg+xml,${'a'.repeat(400)}` }],
    interactive: [], overflowPx: 0, consoleErrors: [], largestHeadingPx: 40,
    viewport: { width: 1440, height: 900 }
  });

  const evidence = result.issues.find(({ rule }) => rule === 'image-alt').evidence;
  assert.ok(evidence.length <= 164);
  assert.match(evidence, /…$/);
});

test('flags a missing H1', () => {
  const result = evaluateSnapshot({ title: 'Page', metaDescription: 'Description', h1Count: 0 });
  assert.deepEqual(result.issues[0], {
    rule: 'h1-count', severity: 'high', message: 'Page has no H1 heading.', evidence: 'Found 0 H1 elements'
  });
});

test('flags duplicate H1 headings', () => {
  const result = evaluateSnapshot({ title: 'Page', metaDescription: 'Description', h1Count: 3 });
  assert.deepEqual(result.issues[0], {
    rule: 'h1-count', severity: 'medium', message: 'Page has multiple H1 headings.', evidence: 'Found 3 H1 elements'
  });
});

test('flags images with missing alt text', () => {
  const result = evaluateSnapshot({ title: 'Page', metaDescription: 'Description', h1Count: 1,
    images: [{ src: '/hero.jpg', alt: '' }, { src: '/logo.svg', alt: 'Logo' }] });
  assert.deepEqual(result.issues[0], {
    rule: 'image-alt', severity: 'medium', message: '1 image is missing alt text.', evidence: '/hero.jpg'
  });
});

test('flags horizontal overflow', () => {
  const result = evaluateSnapshot({ title: 'Page', metaDescription: 'Description', h1Count: 1, overflowPx: 84 });
  assert.deepEqual(result.issues[0], {
    rule: 'horizontal-overflow', severity: 'high', message: 'Page overflows the viewport horizontally.', evidence: 'Content extends 84px beyond the viewport'
  });
});

test('flags browser console errors', () => {
  const result = evaluateSnapshot({ title: 'Page', metaDescription: 'Description', h1Count: 1,
    consoleErrors: ['TypeError: boom', 'Failed to load resource'] });
  assert.deepEqual(result.issues[0], {
    rule: 'console-errors', severity: 'high', message: '2 console errors were recorded.', evidence: 'TypeError: boom\nFailed to load resource'
  });
});

test('flags touch targets smaller than 44 by 44 pixels', () => {
  const result = evaluateSnapshot({ title: 'Page', metaDescription: 'Description', h1Count: 1,
    interactive: [{ label: 'Menu', width: 32, height: 40 }, { label: 'Buy', width: 80, height: 48 }] });
  assert.deepEqual(result.issues[0], {
    rule: 'touch-target', severity: 'medium', message: '1 interactive element has a small touch target.', evidence: 'Menu (32×40px)'
  });
});

test('flags oversized headings using a mobile-aware threshold', () => {
  const result = evaluateSnapshot({ title: 'Page', metaDescription: 'Description', h1Count: 1,
    largestHeadingPx: 88, largestHeadingText: 'A huge promise', viewport: { width: 390, height: 844 } });
  assert.deepEqual(result.issues[0], {
    rule: 'oversized-heading', severity: 'low', message: 'A heading may overwhelm the mobile viewport.', evidence: '“A huge promise” renders at 88px (64px limit)'
  });
});
