/**
 * Preferences FOUC codegen — bake-time allowlists only.
 * Head path = localStorage + setProperty; no runtime `@tgmc/theme` import in the script string.
 * Colour map is computed by Preferences paint and persisted (`tgmc-theme-color-tokens`) on commit.
 */
import { BACKGROUND_CUSTOM_OPTIONS, COLOR_TOKENS_KEY, LEGACY_BACKGROUND_OPTION_KEYS, LEGACY_KEYS } from './document';
import { COLOR_TOKENS_MAX_LENGTH, RUNTIME_COLOR_TOKEN_NAMES } from './paint';
import { PREFERENCES_KEY, PREFERENCES_MAX_LENGTH, PREFERENCES_VERSION } from './storage';

/**
 * Inline FOUC guard: mode, motion and background options from `tgmc-preferences` (legacy flat keys
 * only when it is absent) plus the sanitised runtime colour map. The inline `leg` fallback branch in
 * this script and `LEGACY_KEYS` in `./document` are removed together with `./legacy` next release.
 * A present but oversized, corrupt or wrong-version document means defaults, never the legacy keys.
 * The colour map is sanitised the same way as {@link sanitizeColorTokenMap}: only the allowlisted
 * names, only `#rrggbb` values, and nothing when the stored JSON is oversized. Background options
 * stored under a pre-rename key (`--portfolio-background-primary` …) are applied under the new
 * `--portfolio-*-color` name (a usable new value wins).
 */
export function foucScript(): string {
  const names = JSON.stringify(RUNTIME_COLOR_TOKEN_NAMES);
  const optionNames = JSON.stringify(BACKGROUND_CUSTOM_OPTIONS.map((o) => o.variable));
  const legacyByNew: Record<string, string> = Object.fromEntries(
    Object.entries(LEGACY_BACKGROUND_OPTION_KEYS).map(([old, next]) => [next, old])
  );
  const legacyOptionNames = JSON.stringify(BACKGROUND_CUSTOM_OPTIONS.map((o) => legacyByNew[o.variable] ?? ''));
  const L = LEGACY_KEYS;
  return `(function(){try{var ls=localStorage,r=document.documentElement,pr=ls.getItem('${PREFERENCES_KEY}'),pj=null,leg=pr===null;if(pr!==null&&pr.length<=${PREFERENCES_MAX_LENGTH}){try{pj=JSON.parse(pr);}catch(e){}}if(!pj||typeof pj!=='object'||pj.v!==${PREFERENCES_VERSION})pj={};var p=leg?ls.getItem('${L.themeMode}'):pj.mode;var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var m=(p==='light'||p==='dark')?p:(d?'dark':'light');r.setAttribute('data-theme',m);r.style.colorScheme=m;r.classList.toggle('p-dark',m==='dark');var ct=ls.getItem('${COLOR_TOKENS_KEY}');if(ct&&ct.length<=${COLOR_TOKENS_MAX_LENGTH}){try{var cv=JSON.parse(ct),ck=${names};if(cv&&typeof cv==='object'&&!Array.isArray(cv)){for(var ci=0;ci<ck.length;ci++){var cx=cv[ck[ci]];if(typeof cx==='string'&&/^#[0-9a-f]{6}$/i.test(cx))r.style.setProperty(ck[ci],cx.toLowerCase());}}}catch(e){}}var bv=pj.backgroundOptions;if(leg){var bo=ls.getItem('${L.backgroundOptions}');if(bo){try{bv=JSON.parse(bo);}catch(e){}}}if(bv&&typeof bv==='object'){var bk=${optionNames},bl=${legacyOptionNames};var bok=function(v){return typeof v==='string'&&v.length<=600&&!/[;{}<>]/.test(v);};for(var bi=0;bi<bk.length;bi++){var bx=bv[bk[bi]];if(!bok(bx)&&bl[bi])bx=bv[bl[bi]];if(bok(bx))r.style.setProperty(bk[bi],bx);}}var x=leg?ls.getItem('${L.motion}'):pj.motion;if(x==='system'||x==='playful'||x==='reduced')r.setAttribute('data-motion',x);}catch(e){}})();`;
}
