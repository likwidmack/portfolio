import { createServer, request } from 'node:http';
import type { AddressInfo } from 'node:net';

import { createApp, createRouter, toNodeListener, type EventHandler, type RouterMethod } from 'h3';

export type TestServer = { url: string; close: () => Promise<void> };

/** Status of a request sent with the path exactly as given (`fetch` would normalize `%2e%2e` segments away). */
export function rawRequestStatus(baseUrl: string, path: string, method = 'GET'): Promise<number> {
  const { hostname, port } = new URL(baseUrl);
  return new Promise((resolve, reject) => {
    const req = request({ hostname, port, path, method }, (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    });
    req.on('error', reject);
    req.end();
  });
}

/** Real h3 app on an ephemeral port, so routes are exercised over HTTP (streams, HEAD, status codes). */
export async function serveRoutes(
  routes: Array<{ path: string; handler: EventHandler; method?: RouterMethod }>
): Promise<TestServer> {
  const app = createApp();
  const router = createRouter();
  for (const route of routes) {
    router.add(route.path, route.handler, route.method);
  }
  app.use(router);
  const server = createServer(toNodeListener(app));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
