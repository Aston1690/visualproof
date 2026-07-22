import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { evaluateSnapshot } from './core.js';

export const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 }
];

const gradeFor = (score) => score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

async function collectEvidence(page, viewport, consoleErrors) {
  const browserEvidence = await page.evaluate(() => {
    const documentElement = document.documentElement;
    const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
      .map((element) => ({
        text: element.textContent?.trim() || '',
        size: Number.parseFloat(getComputedStyle(element).fontSize) || 0
      }))
      .sort((a, b) => b.size - a.size);

    const interactiveSelector = 'a[href],button,input,select,textarea,[role="button"],[tabindex]:not([tabindex="-1"])';
    const interactive = [...document.querySelectorAll(interactiveSelector)]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          label: element.getAttribute('aria-label') || element.textContent?.trim() || element.getAttribute('name') || element.tagName.toLowerCase(),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        };
      });

    return {
      title: document.title,
      metaDescription: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      h1Count: document.querySelectorAll('h1').length,
      images: [...document.images].map((image) => ({ alt: image.getAttribute('alt') || '', src: image.currentSrc || image.src })),
      interactive,
      overflowPx: Math.max(0, Math.ceil(documentElement.scrollWidth - documentElement.clientWidth)),
      largestHeadingPx: headings[0]?.size || 0,
      largestHeadingText: headings[0]?.text || ''
    };
  });

  return { ...browserEvidence, viewport, consoleErrors };
}

export async function auditTarget(url, outputDir, options = {}) {
  const viewports = options.viewports ?? VIEWPORTS;
  if (!Array.isArray(viewports) || viewports.length === 0) {
    throw new Error('VisualProof requires at least one viewport.');
  }
  for (const viewport of viewports) {
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(String(viewport.name ?? ''))) {
      throw new Error('Each viewport must have a safe name containing only letters, numbers, underscores, or hyphens.');
    }
    if (!Number.isInteger(viewport.width) || !Number.isInteger(viewport.height) || viewport.width < 1 || viewport.height < 1 || viewport.width > 10000 || viewport.height > 10000) {
      throw new Error('Viewport width and height must be positive integers no greater than 10000.');
    }
  }
  const browser = await chromium.launch({ headless: true });
  const screenshotsDir = path.join(outputDir, 'screenshots');
  await mkdir(screenshotsDir, { recursive: true });

  try {
    const results = [];
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const page = await context.newPage();
      const consoleErrors = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });
      page.on('pageerror', (error) => consoleErrors.push(error.message));

      await page.goto(url, { waitUntil: 'load', timeout: options.timeout ?? 30000 });
      const evidence = await collectEvidence(page, { width: viewport.width, height: viewport.height }, consoleErrors);
      const assessment = evaluateSnapshot(evidence);
      const screenshot = `screenshots/${viewport.name}.png`;
      await page.screenshot({ path: path.join(outputDir, screenshot), fullPage: true });
      results.push({
        name: viewport.name,
        viewport: { width: viewport.width, height: viewport.height },
        screenshot,
        evidence,
        ...assessment
      });
      await context.close();
    }

    const score = Math.round(results.reduce((total, result) => total + result.score, 0) / results.length);
    return {
      tool: 'VisualProof',
      version: '0.1.0',
      url,
      auditedAt: new Date().toISOString(),
      summary: {
        score,
        grade: gradeFor(score),
        issueCount: results.reduce((total, result) => total + result.issues.length, 0),
        viewports: results.length
      },
      results
    };
  } finally {
    await browser.close();
  }
}
