import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import history from "connect-history-api-fallback";
import express from "express";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, "dist");
const port = Number(process.env.PORT || 9200);

const app = express();
app.disable("x-powered-by");
app.use(history());
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
}

const server = http.createServer(app);
server.listen(port, "0.0.0.0", () => {
  process.stdout.write(`portfolio static server on http://127.0.0.1:${port}\n`);
});
