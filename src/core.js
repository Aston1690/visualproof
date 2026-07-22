const WEIGHTS = { high: 12, medium: 6, low: 3 };
const concise = (value, limit = 160) => value.length > limit ? `${value.slice(0, limit)}…` : value;

export function evaluateSnapshot(snapshot) {
  const issues = [];

  if (!snapshot.title?.trim()) {
    issues.push({
      rule: 'document-title',
      severity: 'high',
      message: 'Page title is missing.',
      evidence: 'document.title is empty'
    });
  }

  if (!snapshot.metaDescription?.trim()) {
    issues.push({
      rule: 'meta-description',
      severity: 'medium',
      message: 'Meta description is missing.',
      evidence: 'meta[name="description"] is empty or absent'
    });
  }

  if (snapshot.h1Count === 0) {
    issues.push({
      rule: 'h1-count', severity: 'high', message: 'Page has no H1 heading.', evidence: 'Found 0 H1 elements'
    });
  } else if (snapshot.h1Count > 1) {
    issues.push({
      rule: 'h1-count', severity: 'medium', message: 'Page has multiple H1 headings.', evidence: `Found ${snapshot.h1Count} H1 elements`
    });
  }

  const missingAlt = (snapshot.images ?? []).filter((image) => !image.alt?.trim());
  if (missingAlt.length) {
    issues.push({
      rule: 'image-alt', severity: 'medium',
      message: `${missingAlt.length} image${missingAlt.length === 1 ? '' : 's'} ${missingAlt.length === 1 ? 'is' : 'are'} missing alt text.`,
      evidence: missingAlt.map((image) => concise(image.src || '(inline image)')).join(', ')
    });
  }

  if (snapshot.overflowPx > 0) {
    issues.push({
      rule: 'horizontal-overflow', severity: 'high', message: 'Page overflows the viewport horizontally.',
      evidence: `Content extends ${snapshot.overflowPx}px beyond the viewport`
    });
  }

  if (snapshot.consoleErrors?.length) {
    issues.push({
      rule: 'console-errors', severity: 'high',
      message: `${snapshot.consoleErrors.length} console error${snapshot.consoleErrors.length === 1 ? ' was' : 's were'} recorded.`,
      evidence: snapshot.consoleErrors.join('\n')
    });
  }

  const smallTargets = (snapshot.interactive ?? []).filter(({ width, height }) => width < 44 || height < 44);
  if (smallTargets.length) {
    issues.push({
      rule: 'touch-target', severity: 'medium',
      message: `${smallTargets.length} interactive element${smallTargets.length === 1 ? ' has a' : 's have'} small touch target${smallTargets.length === 1 ? '' : 's'}.`,
      evidence: smallTargets.map(({ label, width, height }) => `${label || 'Unlabelled control'} (${width}×${height}px)`).join(', ')
    });
  }

  const headingLimit = snapshot.viewport?.width <= 480 ? 64 : 96;
  if (snapshot.largestHeadingPx > headingLimit) {
    issues.push({
      rule: 'oversized-heading', severity: 'low',
      message: `A heading may overwhelm the ${snapshot.viewport.width <= 480 ? 'mobile ' : ''}viewport.`,
      evidence: `“${snapshot.largestHeadingText || 'Heading'}” renders at ${snapshot.largestHeadingPx}px (${headingLimit}px limit)`
    });
  }

  const deduction = issues.reduce((total, issue) => total + WEIGHTS[issue.severity], 0);
  const score = Math.max(0, 100 - deduction);
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

  return { score, grade, issues };
}
