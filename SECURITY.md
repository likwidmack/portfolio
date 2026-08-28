# Security policy

## Supported versions

Security fixes apply to the latest `main` snapshot of this repository and to the live site at [likwidmack.com](https://likwidmack.com). Older tagged copies are not patched.

## Reporting a vulnerability

**Do not** report security issues through public GitHub issues, discussions, or pull requests.

Use GitHub private vulnerability reporting:

1. Open [Report a vulnerability](https://github.com/likwidmack/portfolio/security/advisories/new).
2. Include the affected path or URL, what you expected, what happened, and a minimal reproducer.
3. Do not include production secrets, session cookies, or personal data belonging to other people.

If private reporting is unavailable, email [likwidmack@gmail.com](mailto:likwidmack@gmail.com) with the subject `Security: likwidmack/portfolio`.

Please wait for a reply before publishing an exploit or a write-up.

## What to expect

- Acknowledgement within **7 days** when a report is valid and in scope.
- A decision to accept, decline, or request more detail.
- A GitHub Security Advisory when a validated issue is fixed and it is safe to disclose.

This is a personal portfolio. There is no 24/7 on-call rotation.

## Scope

**In scope**

- This repository’s application code, workflows, and dependency lockfiles
- likwidmack.com as served from this project

**Out of scope**

- Denial of service, spam, or social engineering
- Findings that require physical access or a compromised GitHub account
- Vulnerabilities only in third-party SaaS, CDNs, or browsers
- Issues already fixed on `main`

## Safe harbor

Good-faith research that follows this policy and avoids privacy harm, service disruption, and data exfiltration will not be treated as abuse.
