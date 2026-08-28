/**
 * CDN Type Definitions
 *
 * Type definitions for CDN-related functionality.
 */

declare module '#app' {
  interface NuxtApp {
    /**
     * CDN utilities and configuration
     */
    $cdn: {
      /**
       * Whether CDN is enabled
       */
      enabled: boolean;
      /**
       * CDN base URL
       */
      url: string;
      /**
       * Resolve asset path to CDN URL
       */
      resolve?: (path: string) => string;
    };
    /**
     * CDN base URL (shorthand)
     */
    $cdnUrl: string;
  }
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    /**
     * CDN utilities and configuration
     */
    $cdn: {
      enabled: boolean;
      url: string;
      resolve?: (path: string) => string;
    };
    /**
     * CDN base URL (shorthand)
     */
    $cdnUrl: string;
  }
}

/**
 * CDN Configuration at runtime
 */
export interface CdnConfig {
  /**
   * Whether CDN is enabled
   */
  enabled: boolean;
  /**
   * CDN base URL
   */
  url: string;
}

/**
 * CDN Helper with utility methods
 */
export interface CdnHelper extends CdnConfig {
  /**
   * Resolve an asset path to CDN URL
   */
  resolve: (path: string) => string;
  /**
   * Resolve multiple asset paths
   */
  resolvePaths: (paths: string[]) => string[];
  /**
   * Get CDN configuration
   */
  config: CdnConfig;
}

/**
 * Runtime config with CDN settings
 */
export interface RuntimeConfig {
  public: {
    cdnUrl?: string;
  };
}

export {};
