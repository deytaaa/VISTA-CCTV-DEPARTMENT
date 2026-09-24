const crypto = require('crypto');
const supabase = require('../lib/supabase');

// Every authenticated request used to cost two Supabase round trips — one to
// auth.getUser() and one to read the profile row — before the endpoint did any
// of its own work. Measured at ~100ms per round trip, that put a ~200ms floor
// under every call, which was most of a ~500ms response.
//
// Verified sessions are cached briefly, keyed by a hash of the bearer token.
//
// TRADE-OFF: a role change, deactivation or ban takes up to AUTH_CACHE_TTL_MS
// to be observed by this process. Keep the TTL short. Set AUTH_CACHE_TTL_MS=0
// to disable caching entirely if an environment needs changes to apply
// immediately.
const AUTH_CACHE_TTL_MS =
  process.env.AUTH_CACHE_TTL_MS !== undefined ? Number(process.env.AUTH_CACHE_TTL_MS) : 30_000;
const AUTH_CACHE_MAX_ENTRIES = Number(process.env.AUTH_CACHE_MAX_ENTRIES) || 1000;

const sessionCache = new Map();

function cacheKey(token) {
  // Hashed so raw bearer tokens are not used as map keys.
  return crypto.createHash('sha256').update(token).digest('hex');
}

// The cache must never outlive the token itself, or a request could be served
// on an expired session.
function tokenExpiryMs(token) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof decoded?.exp === 'number' ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

function readCache(key) {
  const entry = sessionCache.get(key);
  if (!entry) return null;

  if (Date.now() >= entry.expiresAt) {
    sessionCache.delete(key);
    return null;
  }

  // Refresh recency so the eviction below drops genuinely idle sessions.
  sessionCache.delete(key);
  sessionCache.set(key, entry);
  return entry.context;
}

function writeCache(key, context, token) {
  if (AUTH_CACHE_TTL_MS <= 0) return;

  let expiresAt = Date.now() + AUTH_CACHE_TTL_MS;
  const exp = tokenExpiryMs(token);
  if (exp) expiresAt = Math.min(expiresAt, exp);
  if (expiresAt <= Date.now()) return;

  if (sessionCache.size >= AUTH_CACHE_MAX_ENTRIES) {
    // Map preserves insertion order, so the first key is the least recently used.
    const oldest = sessionCache.keys().next().value;
    if (oldest !== undefined) sessionCache.delete(oldest);
  }

  sessionCache.set(key, { context, expiresAt });
}

// Exposed so a password reset / role change handler can drop a session
// immediately instead of waiting out the TTL.
function invalidateSession(token) {
  if (token) sessionCache.delete(cacheKey(token));
}

// Admin actions target a user id, not that user's bearer token, so drop every
// cached session belonging to them. NOTE: the cache is per-process, so on a
// multi-instance deployment other instances still age out on the TTL.
function invalidateUser(userId) {
  if (!userId) return;

  for (const [key, entry] of sessionCache) {
    if (entry.context?.user?.id === userId || entry.context?.authUser?.id === userId) {
      sessionCache.delete(key);
    }
  }
}

function clearSessionCache() {
  sessionCache.clear();
}

async function resolveSession(token) {
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    const failure = new Error(error?.message || 'Invalid token');
    failure.status = 401;
    throw failure;
  }

  const { data: profile } = await supabase.from('users').select('*').eq('id', data.user.id).single();

  // Deactivation sets is_active=false and bans the auth account. The ban alone
  // normally stops the login, but checking the profile makes deactivation
  // authoritative here too rather than relying on that single mechanism.
  if (profile && profile.is_active === false) {
    const failure = new Error('This account has been deactivated.');
    failure.status = 403;
    throw failure;
  }

  const fallbackRole = data.user.user_metadata?.role || data.user.app_metadata?.role || null;

  return {
    authUser: data.user,
    authProfile: profile || null,
    user: profile
      ? {
          ...profile,
          role: profile.role || fallbackRole,
        }
      : {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || data.user.email,
          role: fallbackRole,
        },
  };
}

async function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  if (!token) return res.status(401).json({ error: 'No auth header' });

  const key = cacheKey(token);

  try {
    let context = readCache(key);

    if (!context) {
      context = await resolveSession(token);
      writeCache(key, context, token);
    }

    req.sessionToken = token;
    req.authUser = context.authUser;
    req.authProfile = context.authProfile;
    req.user = context.user;

    return next();
  } catch (err) {
    // A rejected token must never be cached, and any cached copy goes away.
    sessionCache.delete(key);

    if (err?.status === 403) {
      return res.status(403).json({ error: err.message });
    }
    if (err?.status === 401) {
      return res.status(401).json({ error: err.message });
    }

    console.error('Auth middleware error', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (req.user.role !== role) return res.status(403).json({ error: 'Forbidden' });
    return next();
  };
}

module.exports = { authMiddleware, requireRole, invalidateSession, invalidateUser, clearSessionCache };
