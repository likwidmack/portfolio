import { describe, expect, it } from 'vitest';

import { resolveEnvIndicator } from '../app/utils/env-indicator';

describe('resolveEnvIndicator', () => {
  it('hides when showEnvIndicator is false', () => {
    expect(resolveEnvIndicator({ showEnvIndicator: false, sysEnv: 'local' })).toEqual({
      show: false,
      label: 'local',
      ariaLabel: 'Environment: local',
    });
  });

  it('shows sysEnv label when showEnvIndicator is true', () => {
    expect(resolveEnvIndicator({ showEnvIndicator: true, sysEnv: 'development' })).toEqual({
      show: true,
      label: 'development',
      ariaLabel: 'Environment: development',
    });
  });

  it('defaults label to local when sysEnv is missing or blank', () => {
    expect(resolveEnvIndicator({ showEnvIndicator: true })).toEqual({
      show: true,
      label: 'local',
      ariaLabel: 'Environment: local',
    });
    expect(resolveEnvIndicator({ showEnvIndicator: true, sysEnv: '  ' }).label).toBe('local');
  });

  it('treats missing showEnvIndicator as false', () => {
    expect(resolveEnvIndicator({ sysEnv: 'test' }).show).toBe(false);
  });
});
