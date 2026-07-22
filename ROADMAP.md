# VisualProof roadmap

VisualProof is intentionally deterministic and local-first. The roadmap prioritizes checks that produce concrete browser evidence instead of subjective AI commentary.

## 0.1 — Evidence-first audit

- Desktop and mobile screenshots
- Document, heading, image, overflow, console, touch-target, and heading-scale checks
- JSON output for tooling
- Self-contained HTML report for humans

## Next

- Baseline screenshot comparison with visual diffs
- WCAG color-contrast evidence
- Multi-page crawl with shared issue grouping
- GitHub Action with report artifacts and pull-request summaries
- Configurable rule severity and ignore annotations
- Component-density and spacing-consistency analysis

## Principles

1. No AI API key required.
2. Every issue includes reproducible evidence.
3. Reports remain portable and private by default.
4. Rules document their false-positive risks.
5. New behavior starts with a failing test.

Ideas and contributions are welcome through GitHub issues. Please use the Rule proposal template for new checks.
