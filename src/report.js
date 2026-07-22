import { lstat, mkdir, open, realpath, rename, unlink, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const safeNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const safeScreenshot = (value) => {
  const screenshot = String(value ?? '');
  return /^screenshots\/[A-Za-z0-9_.-]+\.png$/.test(screenshot) ? screenshot : '';
};
const safeEmbeddedScreenshot = (value) => {
  const screenshot = String(value ?? '');
  return /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(screenshot) ? screenshot : '';
};

async function atomicWrite(directory, filename, content) {
  const destination = path.join(directory, filename);
  const temporary = path.join(directory, `.visualproof-${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, content, { flag: 'wx' });
    await rename(temporary, destination);
  } finally {
    await unlink(temporary).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
  return destination;
}

const logo = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="#c8ff4d"/><path d="M15 20h9l8 25 8-25h9L37 52H27z" fill="#11150f"/><circle cx="32" cy="16" r="5" fill="#11150f"/></svg>`)}`;

export function renderReportHtml(audit) {
  const resultCards = audit.results.map((result) => {
    const screenshot = safeEmbeddedScreenshot(result.screenshotDataUrl) || safeScreenshot(result.screenshot);
    const width = safeNumber(result.viewport?.width);
    const height = safeNumber(result.viewport?.height);
    const score = safeNumber(result.score);
    const issues = result.issues.length ? result.issues.map((issue) => `
      <article class="issue ${escapeHtml(issue.severity)}">
        <div class="issue-top"><span class="severity">${escapeHtml(issue.severity)}</span><code>${escapeHtml(issue.rule)}</code></div>
        <h4>${escapeHtml(issue.message)}</h4><pre>${escapeHtml(issue.evidence)}</pre>
      </article>`).join('') : '<div class="pass">✓ No issues detected at this viewport.</div>';
    return `<section class="viewport-card">
      <div class="viewport-copy"><div class="eyebrow">${escapeHtml(result.name)} · ${width}×${height}</div>
      <h3>Viewport evidence <span>${escapeHtml(result.grade)} / ${score}</span></h3><div class="issues">${issues}</div></div>
      <a class="shot" href="${screenshot}"><img src="${screenshot}" alt="${escapeHtml(result.name)} screenshot"></a>
    </section>`;
  }).join('');

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>VisualProof audit — ${escapeHtml(audit.url)}</title><style>
:root{color-scheme:dark;--ink:#f4f5ed;--muted:#9ca493;--panel:#171b16;--line:#30382d;--lime:#c8ff4d;--red:#ff806f;--amber:#ffc661}*{box-sizing:border-box}body{margin:0;background:#0c0f0b;color:var(--ink);font:15px/1.55 Inter,ui-sans-serif,system-ui,sans-serif}body:before{content:"";position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 90% 5%,#30401988,transparent 28%),linear-gradient(#ffffff05 1px,transparent 1px);background-size:auto,100% 32px}.wrap{width:min(1180px,calc(100% - 36px));margin:auto;position:relative}.nav{height:84px;display:flex;align-items:center;gap:14px;border-bottom:1px solid var(--line)}.nav img{width:38px}.nav strong{font-size:18px;letter-spacing:-.03em}.nav em{color:var(--muted);font-style:normal;margin-left:auto}.hero{padding:72px 0 56px;display:grid;grid-template-columns:1fr auto;gap:40px;align-items:end}.eyebrow{text-transform:uppercase;letter-spacing:.16em;color:var(--lime);font:700 11px/1.4 ui-monospace,monospace}.hero h1{font-size:clamp(40px,7vw,84px);letter-spacing:-.065em;line-height:.92;margin:14px 0 24px;max-width:820px}.url{color:var(--muted);overflow-wrap:anywhere}.score{width:170px;height:170px;border:1px solid var(--line);border-radius:50%;display:grid;place-content:center;text-align:center;box-shadow:inset 0 0 0 12px #11150f}.score b{font-size:70px;line-height:.9;color:var(--lime)}.score span{color:var(--muted);text-transform:uppercase;letter-spacing:.1em;font-size:11px}.metrics{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--line);border-radius:16px;overflow:hidden;background:#11150fcc;margin-bottom:64px}.metric{padding:22px 26px;border-right:1px solid var(--line)}.metric:last-child{border:0}.metric b{display:block;font-size:28px}.metric span{color:var(--muted)}.viewport-card{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,42%);gap:32px;background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:30px;margin:0 0 28px;box-shadow:0 30px 80px #0005}.viewport-copy h3{font-size:26px;letter-spacing:-.03em;margin:8px 0 24px}.viewport-copy h3 span{float:right;color:var(--lime)}.issues{display:grid;gap:12px}.issue{border:1px solid var(--line);border-left:3px solid var(--amber);border-radius:10px;padding:16px;background:#11150f}.issue.high{border-left-color:var(--red)}.issue.low{border-left-color:#7dc8ff}.issue-top{display:flex;justify-content:space-between}.severity{text-transform:uppercase;font:bold 10px ui-monospace;color:var(--amber)}.high .severity{color:var(--red)}code,pre{font:12px ui-monospace,monospace;color:var(--muted)}.issue h4{font-size:16px;margin:12px 0 6px}.issue pre{white-space:pre-wrap;margin:0}.shot{display:block;align-self:start;background:#090b09;border:1px solid var(--line);border-radius:12px;overflow:hidden}.shot img{display:block;width:100%;height:auto}.pass{padding:20px;border:1px solid #436026;color:var(--lime);border-radius:10px}.footer{padding:40px 0 70px;color:var(--muted);display:flex;justify-content:space-between}@media(max-width:760px){.hero,.viewport-card{grid-template-columns:1fr}.score{width:120px;height:120px}.score b{font-size:48px}.metrics{grid-template-columns:1fr}.metric{border-right:0;border-bottom:1px solid var(--line)}}
</style></head><body><main class="wrap"><nav class="nav"><img src="${logo}" alt=""><strong>VisualProof</strong><em>Evidence-first visual QA</em></nav>
<header class="hero"><div><div class="eyebrow">Audit completed · ${escapeHtml(audit.auditedAt)}</div><h1>Proof over opinion.</h1><div class="url">${escapeHtml(audit.url)}</div></div><div class="score"><b>${escapeHtml(audit.summary.grade)}</b><span>${safeNumber(audit.summary.score)} / 100</span></div></header>
<section class="metrics"><div class="metric"><b>${safeNumber(audit.summary.issueCount)}</b><span>Issues recorded</span></div><div class="metric"><b>${safeNumber(audit.summary.viewports)}</b><span>Viewports captured</span></div><div class="metric"><b>${safeNumber(audit.summary.score)}</b><span>Overall score</span></div></section>
${resultCards}<footer class="footer"><span>Generated by VisualProof ${escapeHtml(audit.version)}</span><span>Objective evidence. Actionable QA.</span></footer></main></body></html>`;
}

export async function writeReport(audit, outputDir) {
  await mkdir(outputDir, { recursive: true });
  const outputRoot = await realpath(outputDir);
  const json = path.join(outputRoot, 'report.json');
  const html = path.join(outputRoot, 'index.html');
  const reportAudit = structuredClone(audit);
  await Promise.all(reportAudit.results.map(async (result) => {
    const screenshot = safeScreenshot(result.screenshot);
    if (!screenshot) return;
    const screenshotPath = path.resolve(outputDir, screenshot);
    const screenshotLinkStat = await lstat(screenshotPath);
    if (screenshotLinkStat.isSymbolicLink()) {
      throw new Error('Refusing to embed a screenshot symbolic link.');
    }
    const resolvedScreenshot = await realpath(screenshotPath);
    const relativeScreenshot = path.relative(outputRoot, resolvedScreenshot);
    if (relativeScreenshot === '' || relativeScreenshot.startsWith('..') || path.isAbsolute(relativeScreenshot)) {
      throw new Error('Screenshot path escapes the report output directory.');
    }
    const screenshotFile = await open(resolvedScreenshot, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const screenshotStat = await screenshotFile.stat();
      if (screenshotStat.dev !== screenshotLinkStat.dev || screenshotStat.ino !== screenshotLinkStat.ino) {
        throw new Error('Screenshot evidence changed during report generation.');
      }
      if (!screenshotStat.isFile() || screenshotStat.nlink !== 1) {
        throw new Error('Screenshot evidence must be a regular, unlinked file.');
      }
      const image = await screenshotFile.readFile();
      result.screenshotDataUrl = `data:image/png;base64,${image.toString('base64')}`;
    } finally {
      await screenshotFile.close();
    }
  }));
  await Promise.all([
    atomicWrite(outputRoot, 'report.json', `${JSON.stringify(audit, null, 2)}\n`),
    atomicWrite(outputRoot, 'index.html', renderReportHtml(reportAudit))
  ]);
  return { json, html };
}
