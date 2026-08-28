/**
 * Downloads a blob from `url` by synthesizing an `<a download>` click (runs in the browser DOM).
 *
 * Uses `fetch` with `mode: 'no-cors'`, which limits response inspection — suitable for triggering downloads only.
 *
 * @param url - Asset or API URL that returns downloadable bytes under CORS/`no-cors` rules
 * @param fileName - Suggested local filename (`download` attribute)
 */
export function downloadFile(url: string, fileName: string) {
  fetch(url, { method: 'get', mode: 'no-cors', referrerPolicy: 'no-referrer' })
    .then((res) => res.blob())
    .then((res) => {
      const aElement = document.createElement('a');
      aElement.setAttribute('download', fileName);
      const href = URL.createObjectURL(res);
      aElement.href = href;
      aElement.setAttribute('target', '_blank');
      aElement.click();
      URL.revokeObjectURL(href);
    });
}
