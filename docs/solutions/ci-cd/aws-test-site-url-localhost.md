---
title: 'AWS test CD baked localhost SITE_URL into Lambda'
date: 2026-10-16
category: ci-cd
module: 'scripts/sam-cd-deploy.mjs, .github/workflows/cd-aws.yml'
problem_type: misconfiguration
severity: high
applies_when:
  - 'Deploying portfolio-test via CD AWS Test'
  - 'og:url / canonical / runtimeConfig.public.siteUrl show http://localhost:4200 on execute-api'
  - 'Changing SITE_URL handling in sam-cd-deploy or cd-aws.yml'
tags: [sam, site-url, test-env, github-environments, cd-aws]
---

# AWS test CD baked `localhost` SITE_URL into Lambda

## Symptom

Live `portfolio-test` HTML advertises `runtimeConfig.public.siteUrl` (and og/canonical) as `http://localhost:4200` while the app is served from `https://….execute-api.us-west-2.amazonaws.com`.

## Cause

`cd-aws.yml` passed `SITE_URL: ${{ vars.SITE_URL || 'http://localhost:4200' }}`. When GitHub Environment `test` left `SITE_URL` unset, SAM parameter `SiteUrl` (Lambda `SITE_URL` / `NUXT_PUBLIC_SITE_URL`) became localhost. `buildSamParameterOverrides('test')` also defaulted to the same localhost value and only enforced HTTPS for production.

Local `npm run e2e:regression` never hits execute-api + Lambda env, so it stayed green.

## Fix

- Resolve a **public HTTPS** origin before build/deploy (`ensureCdSiteUrlEnv`): prefer Environment `SITE_URL`, else stack output `HttpApiUrl` for `test`; fail closed otherwise.
- Remove the workflow localhost fallback; post-deploy smoke rejects HTML that still contains localhost `siteUrl` / og URLs and requires `siteUrl` to match `HttpApiUrl`.
- Prefer setting Environment `test` var `SITE_URL` to the stack `HttpApiUrl` so builds do not depend on a prior stack read.

## Prevention

- `scripts/sam-deploy-flow.test.mjs` and `scripts/cicd-workflow-policy.test.mjs` guard the contract.
- Docs: `docs/cicd.md` — test Environment `SITE_URL` row.
- Cursor rule (always on): `.cursor/rules/aws-site-url.mdc` — public HTTPS only; no localhost fallback; fail closed; smoke; report immediately.
- Verify rule: `.cursor/rules/full-review-verify-test.mdc` — report every defect immediately; local e2e ≠ AWS topology; check deployed `siteUrl` / canonical are public HTTPS.
- CD skill: `.cursor/rules/portfolio-aws-cicd.mdc` + `.agents/skills/portfolio-aws-cicd/`.
