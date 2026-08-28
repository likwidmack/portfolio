/**
 * Minimal typing for `mux.js` mp4 Transmuxer used by {@link transmuxTsToFmp4}.
 * The package ships without complete TypeScript definitions.
 */
declare module 'mux.js' {
  const muxjs: {
    mp4: {
      Transmuxer: new () => {
        on(event: 'data', handler: (segment: { data: Uint8Array }) => void): void;
        push(data: Uint8Array): void;
        flush(): void;
      };
    };
  };
  export default muxjs;
}
