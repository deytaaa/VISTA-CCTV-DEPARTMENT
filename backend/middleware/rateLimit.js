const rateLimit = require('express-rate-limit');

// All limits are tunable by env so production can be tightened without a code
// change. Defaults are chosen to sit well above normal human use (a page load
// costs well under 20 requests) while still cutting off sustained hammering.
function num(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const MINUTE = 60 * 1000;
const FIFTEEN_MINUTES = 15 * MINUTE;

function limitHandler(message) {
  return (req, res) => {
    res.status(429).json({ error: message });
  };
}

const common = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
};

// Short window: stops a burst of hundreds of requests in a few seconds.
const burstLimiter = rateLimit({
  ...common,
  windowMs: MINUTE,
  limit: num('RATE_LIMIT_BURST', 300),
  handler: limitHandler('Too many requests. Please slow down and try again shortly.'),
});

// Long window: stops slow, sustained scraping that stays under the burst limit.
const sustainedLimiter = rateLimit({
  ...common,
  windowMs: FIFTEEN_MINUTES,
  limit: num('RATE_LIMIT_SUSTAINED', 2000),
  handler: limitHandler('Request quota exceeded. Please try again later.'),
});

// Account-related endpoints: creating users, resetting passwords, registering.
// These are the ones worth guessing at, so they get a much tighter budget.
const accountLimiter = rateLimit({
  ...common,
  windowMs: FIFTEEN_MINUTES,
  limit: num('RATE_LIMIT_ACCOUNT', 40),
  handler: limitHandler('Too many account requests. Please try again later.'),
});

// Every call to /api/jo/generate permanently consumes a JO number from the
// yearly sequence, so an unbounded caller can burn the numbering and leave
// audit gaps. Capped on a short window.
const joNumberLimiter = rateLimit({
  ...common,
  windowMs: MINUTE,
  limit: num('RATE_LIMIT_JO_GENERATE', 30),
  handler: limitHandler('Too many job order numbers requested. Please wait a moment.'),
});

// Proof uploads buffer the file in memory before it is forwarded to storage.
const uploadLimiter = rateLimit({
  ...common,
  windowMs: FIFTEEN_MINUTES,
  limit: num('RATE_LIMIT_UPLOAD', 120),
  handler: limitHandler('Too many uploads. Please try again later.'),
});

module.exports = {
  burstLimiter,
  sustainedLimiter,
  accountLimiter,
  joNumberLimiter,
  uploadLimiter,
};
