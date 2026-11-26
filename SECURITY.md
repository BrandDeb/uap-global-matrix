# UAP/MATRIX security specification

_Last reviewed: 26 November 2026 · Owner: Lowkee Studios_

No system is invulnerable. This document defines how UAP/MATRIX reduces risk,
what has been tested, and what must happen before handling payments.

## Reporting a vulnerability
Use a private GitHub security advisory on this repository (see `/.well-known/security.txt`).
Please do not open public issues for security problems. We aim to respond within 72 hours.

## 1. Threat model
| Threat | Main defences |
|---|---|
| Account takeover | Google/GitHub OAuth only (no passwords stored), Auth.js signed JWT sessions, HTTPS-only, HSTS preload |
| Cheating / economy fraud (cards) | All rolls, grants, training, trades and battles run server-side in DB transactions with `crypto.randomInt`; browser never decides outcomes |
| CSRF / drive-by writes | `src/proxy.ts` rejects cross-origin POST/PUT/PATCH/DELETE to `/api/*`; Auth.js CSRF tokens; SameSite=Lax cookies |
| XSS | React output escaping, no user HTML rendering, JSON-LD escaped, strict CSP (`object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`) |
| SQL injection | Every query uses parameterised tagged templates (`postgres` driver); no string-built SQL |
| Clickjacking | `X-Frame-Options: DENY` + `frame-ancestors 'none'` |
| Abuse / indecent content | Text: local filter + Gemini classification on Comms, sighting reports and comments; images: Gemini screening that **fails closed**; instant ban for sexual/hate/threat, 3 strikes otherwise; report-to-hide |
| Phishing / fake links | Links blocked in Comms; image uploads reject text/links/QR codes; only Google/GitHub sign-in (no credential forms to imitate); `security.txt` published |
| Spam / floods / AI-quota burning | Per-user and per-IP sliding-window rate limits on every write and AI endpoint; body-size caps (2 MB, 6 MB uploads) |
| DDoS | Vercel edge network (automatic L3/L4 mitigation) + Vercel Firewall (enable rules below) |
| Vulnerable dependencies | `npm audit` = 0 known vulnerabilities (Next.js 16.4.6; overrides for transitive packages); review monthly |
| Secret leakage | Secrets only in Vercel env vars, never in git; `.env*` gitignored; scanners probing `/.env`, `/.git` get 404 |
| Privacy | Random codename handles (no real names), rounded location kept on device, no ad trackers, cookieless analytics |

## 2. Controls in code
- **Headers** (`next.config.ts`): CSP, HSTS (2 years, preload), nosniff, DENY framing, strict referrer, Permissions-Policy (camera/mic/payment off), COOP, `X-Powered-By` removed.
- **Proxy** (`src/proxy.ts`): same-origin enforcement for API writes, body-size limits, scanner-probe blocking.
- **Rate limits** (`limited()` in `src/lib/apiHelpers.ts`): Comms 1/10 s & 60/day, comments 1/10 s & 60/day, cards 15/10 s, uploads 5/10 min, sighting reports 5/10 min, AI 6–8/min.
- **Moderation** (`src/lib/moderation.ts`): `moderate()` for text, `moderateImage()` for images (fails closed), strikes/bans in `user_standing`.
- **Authorisation**: every write that affects another user, the economy or public content requires a verified session; the server derives identity, never trusting client-sent ids or handles.

## 3. Penetration test log (internal, 26 Nov 2026)
| Test | Result |
|---|---|
| Security headers present | 6/6 ✔ |
| Cross-site POST to `/api/comms`, `/api/cards` | 403 ✔ |
| Unauthenticated economy/profile/trade writes | 401 ✔ |
| Removed legacy client-trusting card endpoints | 404 ✔ (found re-introduced by a merge and removed) |
| `/.env`, `/wp-login.php` probes | 404 ✔ |
| 3 MB body to JSON API | 413 ✔ |
| SQL injection in query/path params (alerts, pilot, crop id) | Rejected, tables intact ✔ |
| Path traversal in crop id | 404 ✔ |
| Anonymous comment / anonymous image upload | 401 ✔ (both were open before this review) |
| AI endpoint flood | 429 after limit ✔ |
| CSP breakage across key pages | No violations ✔ |
| Profanity filter evasion (`f*ck`, `fuuuck`, `sh1t`) vs false positives (Scunthorpe, Essex, cockpit) | Caught / allowed ✔ |

**Limitations:** in-memory rate limits are per server instance (adequate as a first layer; edge firewall handles volume). An internal test is not a substitute for an independent penetration test.

## 4. Operator checklist (Vercel dashboard)
1. **Firewall → Attack Challenge Mode**: switch on during any attack spike.
2. **Firewall → Rules**: add a rate-limit rule for `/api/*` (e.g. 120 requests / 60 s per IP) and enable **Bot Protection**.
3. **Settings → Security → Deployment Protection**: keep preview deployments protected.
4. **Environment variables**: mark secrets **Sensitive**; rotate `AUTH_SECRET`, OAuth secrets and `GEMINI_API_KEY` every 6 months or immediately after any exposure.
5. **GitHub**: enable Dependabot alerts, secret scanning and branch protection on `main`.
6. **Domain** (when you buy one): enable DNSSEC, add CAA records, and register look-alike domains to reduce phishing.

## 5. Before taking payments (PayFast / Google Pay / Stitch)
- Commission an **independent penetration test** (CREST or OSCP-certified tester) covering the card economy and payment flow.
- Never handle card data directly: use the provider's hosted checkout or tokenisation (keeps the app out of PCI-DSS scope).
- Verify every payment webhook signature server-side and make fulfilment idempotent.
- Publish odds for any paid random item and check local gambling / consumer law (South Africa: CPA; EU/UK loot-box rules).
- Add audit logging for all economy changes and an admin review tool.

## 6. Review cadence
- Monthly: `npm audit`, dependency updates, review bans/reports.
- Quarterly: repeat the section 3 test suite; review rate limits.
- Yearly (and before payments launch): independent penetration test.
