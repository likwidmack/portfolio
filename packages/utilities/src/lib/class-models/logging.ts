/**
 * Consola-backed logger for Node and browser consumers.
 *
 * @see https://github.com/unjs/consola
 */
import type { ConsolaOptions } from 'consola';
import { createConsola } from 'consola';

type LogProps = Partial<
  ConsolaOptions & {
    /** Logical name stored on the instance (default `"Logging"`). */
    scope?: string;
    fancy: boolean;
    /**
     * Consumed so it is not passed through to Consola options.
     * Reserved for future platform-specific formatting.
     */
    platform?: 'node' | 'browser' | 'unknown';
  }
>;

/**
 * Thin façade over [Consola](https://github.com/unjs/consola).
 *
 * Level methods (`debug` / `log` / `info` / `warn` / `error`) forward to the
 * internal Consola instance. `group*` helpers use the console group APIs.
 */
export class Logging {
  /**
   * @param options - Consola options plus optional `scope` / `platform`
   */
  constructor({ scope, platform = 'unknown', ...logConfig }: LogProps = {}) {
    void platform;
    const config: Partial<ConsolaOptions & { fancy: boolean }> = {
      level: 3, // 0 silent … 4 debug
      fancy: true,
      ...logConfig,
      formatOptions: {
        columns: 3,
        colors: true,
        compact: true,
        date: true,
        ...logConfig.formatOptions,
      },
    };

    const logger = createConsola(config);
    logger.info(`Consola logger initialized with level "${config.level}"`);

    Object.defineProperties(this, {
      _scope: { value: scope || 'Logging', writable: false, enumerable: false },
      _logger: { value: logger, writable: false, enumerable: false },
    });
  }

  /** Debug-level message. */
  debug(...args: any[]) {
    (this as any)._logger.debug(...args);
  }

  /** Generic log-level message. */
  log(...args: any[]) {
    (this as any)._logger.log(...args);
  }

  /** Info-level message. */
  info(...args: any[]) {
    (this as any)._logger.info(...args);
  }

  /** Warning-level message. */
  warn(...args: any[]) {
    (this as any)._logger.warn(...args);
  }

  /** Error-level message. */
  error(...args: any[]) {
    (this as any)._logger.error(...args);
  }

  /** Opens a console group. */
  group(...args: any[]) {
    console.group(...args);
  }

  /** Opens a collapsed console group. */
  groupCollapsed(...args: any[]) {
    console.groupCollapsed(...args);
  }

  /** Closes the current console group. */
  groupEnd() {
    console.groupEnd();
  }
}

export default Logging;
