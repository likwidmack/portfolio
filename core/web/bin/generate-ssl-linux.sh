#!/usr/bin/env bash
set -euo pipefail

SSL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../bin/ssl" && pwd)"

mkdir -p "$SSL_DIR"

# Git Bash converts `/CN=...` to `C:/Program Files/Git/CN=...`. `//CN=` becomes `/CN=` there.
# Native Linux/WSL OpenSSL wants a single leading slash.
subj="/CN=tgmc-portfolio.dev"
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*) subj="//CN=tgmc-portfolio.dev" ;;
esac

openssl req -x509 -newkey rsa:2048 -sha256 -nodes -days 365 \
  -keyout "$SSL_DIR/localhost-linux.key" \
  -out "$SSL_DIR/localhost-linux.crt" \
  -subj "$subj" \
  -addext "subjectAltName=DNS:localhost,DNS:tgmc-portfolio.dev,DNS:www.tgmc-portfolio.dev,DNS:tgmc-portfolio.local,DNS:www.tgmc-portfolio.local,IP:127.0.0.1,IP:::1"

cp "$SSL_DIR/localhost-linux.key" "$SSL_DIR/localhost.key"
cp "$SSL_DIR/localhost-linux.crt" "$SSL_DIR/localhost.crt"

echo "Generated:"
echo "  $SSL_DIR/localhost-linux.key"
echo "  $SSL_DIR/localhost-linux.crt"
echo "  $SSL_DIR/localhost.key"
echo "  $SSL_DIR/localhost.crt"

# Try to install the generated certificate into the system trust store (Debian/Ubuntu)
# This will add a CA file to /usr/local/share/ca-certificates and run update-ca-certificates.
if command -v update-ca-certificates >/dev/null 2>&1; then
  TARGET=/usr/local/share/ca-certificates/tgmc-portfolio.crt
  echo "\nInstalling certificate to system trust store: $TARGET"
  if [ "$(id -u)" -ne 0 ]; then
    if command -v sudo >/dev/null 2>&1; then
      echo "Running with sudo to install certificate..."
      sudo cp "$SSL_DIR/localhost.crt" "$TARGET" && sudo update-ca-certificates && echo "Certificate installed and CA store updated."
    else
      echo "sudo not found. To install the certificate manually run as root:\n  cp \"$SSL_DIR/localhost.crt\" $TARGET\n  update-ca-certificates"
    fi
  else
    cp "$SSL_DIR/localhost.crt" "$TARGET" && update-ca-certificates && echo "Certificate installed and CA store updated."
  fi
else
  echo "\nupdate-ca-certificates not available on this system. Skipping automatic CA install."
  echo "To trust the cert manually on Debian/Ubuntu, run as root:\n  cp \"$SSL_DIR/localhost.crt\" /usr/local/share/ca-certificates/tgmc-portfolio.crt && update-ca-certificates"
fi
