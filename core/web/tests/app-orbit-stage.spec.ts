import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const componentPath = join(import.meta.dirname, '../app/components/AppOrbitStage/index.vue');
const depthFieldPath = join(import.meta.dirname, '../app/components/AppDepthField/index.vue');

describe('AppOrbitStage', () => {
  it('computes an even angular spread from the studies array length, not a hardcoded count', () => {
    const source = readFileSync(componentPath, 'utf8');
    expect(source).toContain('studies: CaseStudy[]');
    expect(source).toContain('return (index * 360) / (props.studies.length || 1);');
    expect(source).not.toContain('angle: 0,');
  });

  it('delegates the background-mode control to the shared personalization preference', () => {
    const source = readFileSync(componentPath, 'utf8');
    expect(source).toContain('usePersonalization()');
    expect(source).toContain("setBackground('particles')");
    expect(source).toContain("setBackground('grid')");
    expect(source).toContain("setBackground('camera')");
    expect(source).toContain("setBackground('custom')");
    // The camera stream itself is owned by AppDepthField (the page-wide background), not the ring.
    expect(source).not.toContain('getUserMedia');
  });

  it('gates idle rotation behind usePrefersReducedMotion', () => {
    const source = readFileSync(componentPath, 'utf8');
    expect(source).toContain('usePrefersReducedMotion');
    expect(source).toContain('!dragState && !reducedMotion.value');
    expect(source).toContain('if (!reducedMotion.value) tick();');
  });

  it('removes hidden orbit panels from the tab order instead of trapping focus off-screen', () => {
    const source = readFileSync(componentPath, 'utf8');
    expect(source).toContain('p.tabIndex = hidden ? -1 : 0;');
  });
});

describe('AppDepthField background modes', () => {
  it('never auto-requests the camera outside camera mode and stops any stream on unmount', () => {
    const source = readFileSync(depthFieldPath, 'utf8');
    expect(source).toContain("background.value !== 'camera'");
    expect(source).toContain('getUserMedia');
    expect(source).toContain('onBeforeUnmount');
    expect(source).toContain('stopCameraStream');
  });

  it('renders a solid custom fill when background mode is custom', () => {
    const source = readFileSync(depthFieldPath, 'utf8');
    expect(source).toContain("background === 'custom'");
    expect(source).toContain('portfolio-depth-field--custom');
    expect(source).toContain('portfolio-depth-field__custom');
  });
});
