/**
 * Every call site does `${API_BASE_URL}${path}` with a leading-slash `path` (e.g. "/auth/login").
 * If `VITE_API_BASE_URL` itself ends in a slash (an easy .env typo - .env.example has none, but
 * it's easy to add one when pointing at a LAN IP for device testing), that concatenation produces
 * a double slash. Express still routes a double-slash URL just fine, so most of the app appears to
 * work - but the refresh-token cookie is scoped to an exact `Path=/api/auth`, and a browser's
 * cookie path-matching does a literal prefix comparison with no slash-collapsing: "/api//auth/..."
 * does not path-match "/api/auth", so the cookie silently never gets sent on refresh. That makes
 * sessions appear to work until reload (the in-memory access token still has it) and then vanish
 * (the refresh call comes back empty-handed). Stripping trailing slashes once, here, keeps every
 * call site's request path exactly as authored regardless of how the env var is written.
 */
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");
