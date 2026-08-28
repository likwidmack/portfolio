# Local SSL certificates

This folder contains local development certificates used by Nuxt dev server HTTPS.

Files:

- `localhost.key` and `localhost.crt` (default pair used by `core/web/nuxt.config.ts` and docker:dev)
- SANs: `localhost`, `tgmc-portfolio.test`, `www.tgmc-portfolio.test`, `tgmc-portfolio.local`, `www.tgmc-portfolio.local`, `127.0.0.1`, `::1`

Do **not** use `*.dev` hostnames for local HTTPS. The `.dev` TLD is HSTS-preloaded in major browsers, so self-signed certificates cannot get an “Add exception” bypass.

Generate or refresh certs:

```bash
npm run ssl:gen:linux
# or: bash core/web/bin/generate-ssl-linux.sh
```

```powershell
npm run ssl:gen:windows
# or: powershell -ExecutionPolicy Bypass -File core/web/bin/generate-ssl-windows.ps1
```

To use a specific pair, set environment variables:

- `SSL_KEY`
- `SSL_CERT`

Example:

```bash
SSL_KEY=localhost-linux.key SSL_CERT=localhost-linux.crt HTTPS=1 npm run start
```
