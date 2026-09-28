---
title: 'Syntax highlighter showed "=&gt;" and "&amp;&amp;" instead of => and &&'
date: 2026-09-24
category: ui-bugs
module: 'core/web/shared/syntax (UiCodeBlock, /code, gallery code exhibits, parity)'
problem_type: ui_bug
component: syntax_highlighting
severity: medium
applies_when:
  - 'Adding or changing a tokenizer in core/web/shared/syntax'
  - 'Code blocks render entity text (&gt; &lt; &amp;) instead of the characters'
tags: [syntax, escaping, xss, tokenizer]
---

# Syntax highlighter split HTML entities

## Symptom

`/code` rendered `return posts.filter((post) =&gt; … &amp;&amp; …)`. Plain text was fine; only highlighted code broke.

## Cause

`UiCodeBlock` escapes the source (`escapeHtmlText`) and hands the escaped text to the language tokenizers. The tokenizers ran their operator and punctuation regexes **on that escaped text**, so `&` (from `&&`) matched the `&` of `&gt;`, and `;` was tagged as punctuation. `&gt;` became `<span>&</span>gt<span>;</span>`; the browser can't decode a split entity and shows it literally.

## Fix

`createTokenStash()` (`tools/token-pattern-utils.ts`) now returns `raw` (the decoded source, via `decodeHtmlText`) and `finish()`:

- tokenizers run every pass on `raw`, so `=>`, `&&`, `<`, `>=` match as real operators;
- `wrapToken()` escapes its own text;
- `finish(source)` escapes the untokenized text once, then restores the stashed tokens.

Every character is escaped exactly once, and nothing from the source reaches the page unescaped.

## Guard

`core/web/tests/syntax-entities.spec.ts` round-trips TypeScript, JavaScript, Python, SCSS, Bash and C++ samples full of `< > & " '` and fails on split, double-escaped or raw entities.
