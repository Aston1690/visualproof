# Contributing to VisualProof

Thanks for helping make visual QA more objective and useful.

## Start here

1. Check existing issues and discussions before opening a duplicate.
2. For a new rule, explain the measurable signal, expected evidence, severity, and false-positive risks.
3. Keep checks deterministic. VisualProof should not require an AI API key.
4. Add a failing test first, confirm it fails for the expected reason, then implement the smallest fix.

## Local development

```bash
npm install
npx playwright install chromium
npm test
node src/cli.js audit examples/demo/index.html --output visualproof-report
```

## Pull requests

- Keep each pull request focused on one behavior.
- Include tests and update the README when the user-facing behavior changes.
- Include a sample report or screenshot for visual changes.
- Run the complete test suite before requesting review.

## Rule quality checklist

A rule should be:

- Objective and reproducible
- Supported by concrete browser evidence
- Actionable for a developer or designer
- Resistant to common false positives
- Tested on desktop and mobile where relevant

By contributing, you agree that your work may be distributed under the MIT License.
