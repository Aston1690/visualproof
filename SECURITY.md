# Security Policy

## Supported versions

Only the latest released version is supported with security fixes.

## Reporting a vulnerability

Please do not publish exploitable details in a public issue. Use GitHub's private vulnerability reporting for this repository. Include:

- Affected version
- Reproduction steps
- Expected and actual behavior
- Potential impact
- Suggested mitigation, if known

VisualProof opens websites in an automated browser. Audit only URLs you are authorized to access. Treat generated reports and screenshots as potentially sensitive because they may contain private page content.

## Local filesystem threat model

VisualProof validates report paths, rejects screenshot symlinks and hardlinks, and uses exclusive or atomic file creation to avoid following pre-existing malicious entries. Run audits in a directory owned by your account. As with other local developer tools, an output directory being concurrently mutated by a hostile process running as the same OS user is outside the supported security boundary.
