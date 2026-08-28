/**
 * Minimal typing for `m3u8-parser` used by playlist helpers.
 * The package ships without complete TypeScript definitions.
 */
declare module 'm3u8-parser' {
  export class Parser {
    push(chunk: string): void;
    end(): void;
    manifest: {
      playlists?: Array<{
        uri: string;
        attributes?: {
          BANDWIDTH?: number;
          RESOLUTION?: [number, number];
        };
      }>;
      segments?: Array<{ uri: string; duration: number }>;
      endList?: boolean;
    };
  }
}
