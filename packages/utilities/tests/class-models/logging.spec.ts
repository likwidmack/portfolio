import Logging from '../../src/lib/class-models/logging.js';

describe('Logging', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('forwards info/warn/error to consola logger', () => {
    const log = new Logging({ scope: 'test', level: 4 });
    const logger = (log as any)._logger;
    const info = vi.spyOn(logger, 'info').mockImplementation(() => logger);
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => logger);
    const error = vi.spyOn(logger, 'error').mockImplementation(() => logger);

    log.info('hello');
    log.warn('careful');
    log.error('boom');

    expect(info).toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
  });
});
