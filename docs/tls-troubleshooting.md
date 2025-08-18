# TLS troubleshooting (SSL Labs “Failed to communicate”)

Fixes for handshake failures on iOS and SSL Labs errors such as:
- Assessment failed: Failed to communicate with the secure server
- No secure protocol supported / handshake_failure
- no more data allowed for version 1 certificate (invalid v1 certificate)

## Quick checklist
- DNS: Both `trade-calculator.top` and `api.trade-calculator.top` resolve to the correct IP(s). If AAAA (IPv6) exists, your server/load balancer must serve TLS on IPv6 too.
- Firewall/NACL/SG: 443/tcp open to the Internet; no rate limiting or geo/IP blocks affecting SSL Labs.
- TLS termination: Nginx (or your LB) is listening on 443 with TLS, not plaintext HTTP.
- Certificate: Proper X.509 v3 certificate with SANs; serve the full chain (leaf + intermediates). Do not use a self-signed or v1 cert.
- Protocols: Enable TLS 1.2 and 1.3; avoid draft TLS 1.3 or disabling TLS 1.2.
- SNI: Correct cert per hostname (server_name must match the host being requested).

## Recommended Nginx TLS config (modern, iOS-safe)

Use fullchain and key from a trusted CA (e.g., Let’s Encrypt). Create one server block per hostname.

```
# HTTP → HTTPS redirect (keep .well-known for ACME)
server {
  listen 80;
  server_name trade-calculator.top;
  location /.well-known/acme-challenge/ { root /var/www/certbot; }
  location / { return 308 https://$host$request_uri; }
}

server {
  listen 443 ssl http2;
  server_name trade-calculator.top;

  ssl_certificate     /etc/letsencrypt/live/trade-calculator.top/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/trade-calculator.top/privkey.pem;

  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_prefer_server_ciphers off;      # required for TLS 1.3 suites
  ssl_ciphers 'TLS_AES_256_GCM_SHA384:TLS_AES_128_GCM_SHA256:TLS_CHACHA20_POLY1305_SHA256:EECDH+AESGCM:EDH+AESGCM';
  ssl_session_cache shared:SSL:50m;
  ssl_session_timeout 1d;

  # OCSP stapling (optional but recommended)
  ssl_stapling on;
  ssl_stapling_verify on;
  resolver 1.1.1.1 8.8.8.8 valid=300s;

  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

  # ... your existing locations (SPA/static, API proxy, etc.) ...
}

# API hostname
server {
  listen 80;
  server_name api.trade-calculator.top;
  location /.well-known/acme-challenge/ { root /var/www/certbot; }
  location / { return 308 https://$host$request_uri; }
}

server {
  listen 443 ssl http2;
  server_name api.trade-calculator.top;

  ssl_certificate     /etc/letsencrypt/live/api.trade-calculator.top/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.trade-calculator.top/privkey.pem;

  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_prefer_server_ciphers off;
  ssl_ciphers 'TLS_AES_256_GCM_SHA384:TLS_AES_128_GCM_SHA256:TLS_CHACHA20_POLY1305_SHA256:EECDH+AESGCM:EDH+AESGCM';
  ssl_session_cache shared:SSLAPI:50m;
  ssl_session_timeout 1d;

  ssl_stapling on;
  ssl_stapling_verify on;
  resolver 1.1.1.1 8.8.8.8 valid=300s;

  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

  # ... your existing API proxy (e.g., /rest/v1/) ...
}
```

Notes:
- Always use `fullchain.pem` (includes intermediates). Serving only the leaf cert breaks iOS and SSL Labs.
- If using a wildcard cert, ensure SAN covers both hostnames. Otherwise obtain one cert per hostname.
- If TLS terminates at a load balancer, configure the LB’s TLS policy for TLS 1.2/1.3 and attach the full chain there.

## Obtain proper certificates (Let’s Encrypt)
- Use certbot with webroot `/.well-known/acme-challenge/` or the Nginx plugin.
- Deploy both `fullchain.pem` and `privkey.pem` and reload Nginx.

## Verify from outside
Run these from an Internet host (not your server) to avoid internal caches/firewalls.

- Test SNI + chain + protocols (IPv4):
  - `openssl s_client -connect trade-calculator.top:443 -servername trade-calculator.top -tls1_2 -showcerts`
  - `openssl s_client -connect trade-calculator.top:443 -servername trade-calculator.top -tls1_3 -showcerts`
  - `openssl s_client -connect api.trade-calculator.top:443 -servername api.trade-calculator.top -tls1_2 -showcerts`

Look for: certificate chain (leaf + intermediate), issuer, protocol negotiated, and a successful handshake.

## Common root causes mapped to symptoms
- “No secure protocol supported”: TLS 1.2 disabled and server only offers nonstandard/draft TLS 1.3, or port 443 isn’t speaking TLS.
- “v1 certificate” error: self-signed or incorrectly generated cert; replace with a proper v3 CA-issued cert.
- “Unrecognized SSL message, plaintext connection?”: HTTP server bound to port 443; ensure `listen 443 ssl;` and a valid cert.
- “Unexpected failure” with multiple IPs: same hostname resolves to multiple IPs with different configs; align TLS/certs on all.
- IPv6 AAAA present but no IPv6 listener: either remove AAAA or enable TLS on IPv6.

## After changes
- Validate config (`nginx -t`) and reload (`nginx -s reload` or `systemctl reload nginx`).
- Re-test on iOS Safari/Chrome and re-run SSL Labs (allow a few minutes for cache).
