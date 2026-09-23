# VTPC Backend

Node/Express + MongoDB API for the VTPC public site and CMS. Matches the frontend contract: cookie sessions (no JWT), bilingual `{ en, kn }` fields, slug `id`s for districts / focus sectors / GI products, and publicly served uploads.

## Quick start (local)

```bash
cp .env.example .env
# set MONGODB_URI, SESSION_SECRET, CORS_ORIGINS, ADMIN_* 

npm install
npm run seed          # admin user + starter content
npm run dev           # http://localhost:4200  (PORT / PUBLIC_BASE_URL must match)
```

Health check: `GET /health`

Frontend env: `VITE_API_BASE_URL=http://localhost:4200`

Default editor login (change immediately):

- email: `ADMIN_EMAIL`
- password: `ADMIN_PASSWORD`

## File uploads — what the CMS should use

**Both** of these work:

1. **Dedicated upload** (recommended for images/video)  
   `POST /admin/uploads?folder=leaders` as `multipart/form-data` field `file`  
   Allowed folders: `leaders`, `staff`, `gi-products`, `gi-videos`, `focus-sectors`, `downloads`, `misc`  
   Response: `{ "url": "https://api.../uploads/leaders/....jpg", "path": "/uploads/leaders/....jpg" }`  
   Then send that `url` in the normal JSON create/update body (`photo`, `image`, `video`, `fileUrl`).

2. **Direct multipart on the write endpoint**  
   `POST /admin/downloads` (and leaders / staff / GI / focus-sectors) as `multipart/form-data` with the file field (`file` / `photo` / `image` / `video`) plus the other fields. Nested objects can be JSON strings (`title={"en":"...","kn":""}`) or `title[en]`.

Returned URLs are public. The citizen site loads them directly; no auth.

Drop seed media into `uploads/` using the names in `uploads/README.txt`.

## Auth

Session cookie `vtpc.sid` (httpOnly, Secure in production, SameSite from `COOKIE_SAMESITE`).

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` | `{ email, password }` → user profile + Set-Cookie |
| POST | `/auth/logout` | clears cookie |
| GET | `/auth/me` | restore session after refresh |

Login failure is always `{ "message": "Invalid email or password" }` with 401. Admin writes without a session are 401.

## Public vs admin

Every collection except `AdminUser` has public **read** and admin **write**. Enquiries are write-only on the public site (`POST /enquiries`); admins list them at `GET /admin/enquiries`. Newsletter subscribe is public and **idempotent** (repeat email → 200, first time → 201).

Kannada (`kn`) may be `""`. Pagination is not implemented (plain arrays). Rate limits apply to login, enquiries and newsletter subscribe.

## District slugs

`GET /districts/:id` uses the URL slug, not Mongo `_id`. Seeded slugs:

`bagalkote`, `ballari`, `belagavi`, `bengaluru-rural`, `bengaluru-urban`, `bidar`, `chamarajanagar`, `chikkaballapur`, `chikkamagaluru`, `chitradurga`, `dakshina-kannada`, `davanagere`, `dharwad`, `gadag`, `hassan`, `haveri`, `kalaburagi`, `kodagu`, `kolar`, `koppal`, `mandya`, `mysuru`, `raichur`, `ramanagara`, `shivamogga`, `tumakuru`, `udupi`, `uttara-kannada`, `vijayapura`, `yadgir`

If the Karnataka SVG uses different ids, change the `slug` (the API `id`) to match the map.

## EC2

1. Install Node 20, nginx, and either local MongoDB or use Atlas (`MONGODB_URI`).
2. Clone this repo, `cp .env.example .env`, edit:
   - `NODE_ENV=production`
   - `PUBLIC_BASE_URL=https://your-api-host`
   - `CORS_ORIGINS=https://your-frontend-origin` (explicit origin, not `*`)
   - `SESSION_SECRET` = long random string
   - `TRUST_PROXY=1`
   - `COOKIE_SAMESITE=lax` if frontend and API share a parent domain; `none` if they are on different sites (requires HTTPS)
3. `npm ci --omit=dev && npm run seed && npx pm2 start ecosystem.config.cjs`
4. Point nginx at port 4000 (see `deploy/nginx.conf.example`). TLS via certbot.
5. Copy images/PDFs into `uploads/...` as listed in `uploads/README.txt`.

Reset the editor password later with `npm run create-admin` (reads `ADMIN_*` from `.env`).
