# SSL/HTTPS Setup

Configure local HTTPS development for the Nuxt application.

## Generate SSL Certificates

### Windows (PowerShell)

```bash
npm run ssl:gen:windows
```

### Linux/WSL/Git Bash

```bash
npm run ssl:gen:linux
```

On Git Bash for Windows, the script uses `-subj //CN=...` so MSYS does not rewrite `/CN=` to `C:/Program Files/Git/CN=...`.

This generates certificates in `bin/ssl/` directory.

## Start HTTPS Server

```bash
npm run start:ssl:4200
```

The application will be available at:

| Stack                                             | URL                                 | Hosts file                       |
| ------------------------------------------------- | ----------------------------------- | -------------------------------- |
| Local (`npm run start:ssl:4200` / `docker:local`) | `https://tgmc-portfolio.local:4200` | `127.0.0.1 tgmc-portfolio.local` |
| Docker development (`docker:dev`)                 | `https://tgmc-portfolio.test:4200`  | `127.0.0.1 tgmc-portfolio.test`  |

Certs include SANs for `localhost`, `tgmc-portfolio.local`, `www.tgmc-portfolio.local`, `tgmc-portfolio.test`, `www.tgmc-portfolio.test`, `127.0.0.1`, and `::1`.

**Do not use `*.dev`.** Google’s `.dev` TLD is on the browser HSTS preload list, so Firefox/Chrome refuse self-signed certificate exceptions (the warning you cannot bypass). Use `.local` / `.test` instead.

## Configuration

Default certs (after generate scripts):

- `core/web/bin/ssl/localhost.crt`
- `core/web/bin/ssl/localhost.key`

When `HTTPS=1` is set, Nuxt and `docker:dev` (`docker/nitro-ssl-entrypoint.sh`) use these files. Override with `SSL_CERT` / `SSL_KEY`.

## Scripts

Available npm scripts:

- `npm run ssl:gen:windows` - Generate certs (Windows PowerShell)
- `npm run ssl:gen:linux` - Generate certs (Linux/WSL)
- `npm run start:ssl:4200` - Start HTTPS server

## Troubleshooting

### Browser Shows Security Warning

This is normal for self-signed certificates. Click "Advanced" and proceed to localhost.

### Certificate Generation Failed

1. Ensure you have administrative privileges
2. Try the other script if on hybrid system
3. Check `bin/ssl/` directory exists

### Port Already in Use

Change port in command:

```bash
HTTPS=1 npm run dev -- --port 3000
```

## Related Files

- `core/web/bin/ssl/README.md` - Cert filenames and SAN list
- `core/web/bin/generate-ssl-*.sh|.ps1` - Certificate generation scripts
- `core/web/nuxt.config.ts` - HTTPS configuration
- `docker/nitro-ssl-entrypoint.sh` - docker:dev TLS

## See Also

- [Quick Start Guide](../guides/quickstart.md)
- [Environment Variables](./environment.md)
