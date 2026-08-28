// @vitest-environment node

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { EVIDENCE_EXAMPLES, EVIDENCE_EXAMPLE_TABS, evidenceExamplesByKind } from '../shared/evidence-examples';

const root = join(import.meta.dirname, '..');
const banned = [/hyperactivity/i, /\bstand-in\b/i, /"sample"/i];

describe('evidence examples dialog', () => {
  it('exposes code, data, and styles tabs with at least one card each', () => {
    expect(EVIDENCE_EXAMPLE_TABS.map((tab) => tab.value)).toEqual(['code', 'data', 'styles']);
    for (const kind of ['code', 'data', 'styles'] as const) {
      expect(evidenceExamplesByKind(kind).length).toBeGreaterThan(0);
    }
  });

  it('keeps public example copy free of banned phrases', () => {
    for (const example of EVIDENCE_EXAMPLES) {
      const blob = `${example.title}\n${example.summary}\n${example.sourceLabel}\n${example.code}`;
      for (const pattern of banned) {
        expect(blob).not.toMatch(pattern);
      }
    }
  });

  it('wires the dialog into Work index and case study Evidence', async () => {
    const indexPage = await readFile(join(root, 'app/pages/work/index.vue'), 'utf8');
    const studyPage = await readFile(join(root, 'app/pages/work/[slug].vue'), 'utf8');
    const dialog = await readFile(join(root, 'app/components/AppEvidenceExamplesDialog.vue'), 'utf8');

    expect(dialog).toContain('UiDialog.evidence-examples-dialog');
    expect(dialog).toContain('#panel-code');
    expect(dialog).toContain('#panel-data');
    expect(dialog).toContain('#panel-styles');
    expect(indexPage).toContain('AppEvidenceExamplesDialog');
    expect(indexPage).toContain('Browse evidence examples');
    expect(indexPage).toContain('AppWorkSubNav');
    expect(studyPage).toContain('AppEvidenceExamplesDialog');
    expect(studyPage).toContain('Browse evidence examples');
    expect(studyPage).toContain('AppWorkSubNav');
  });
});
