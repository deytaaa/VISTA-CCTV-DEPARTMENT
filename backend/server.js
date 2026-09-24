require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { burstLimiter, sustainedLimiter, accountLimiter } = require('./middleware/rateLimit');
const joRoutes = require('./routes/jo');
const authRoutes = require('./routes/auth');
const itemsRoutes = require('./routes/items');
const personnelRoutes = require('./routes/personnel');
const completionRoutes = require('./routes/completion');
const approvalRoutes = require('./routes/approval');
const logsRoutes = require('./routes/logs');
const jobOrdersRoutes = require('./routes/job-orders');
const usersRoutes = require('./routes/users');
const inventoryRoutes = require('./routes/inventory');

const app = express();

// Behind a proxy (Render, a load balancer) every request arrives from the
// proxy's IP, so rate limiting would bucket all users together unless Express
// is told how many hops to trust. Left off by default for local runs; set
// TRUST_PROXY=1 in the hosted environment.
if (process.env.TRUST_PROXY) {
  const hops = Number(process.env.TRUST_PROXY);
  app.set('trust proxy', Number.isFinite(hops) ? hops : 1);
}

app.use(
  helmet({
    // The API is consumed cross-origin by the Next.js frontend, and serves
    // only JSON, so the same-origin resource policy would block legitimate
    // callers and the HTML-oriented CSP buys nothing here.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);

app.use(cors());
// List payloads are JSON-heavy and highly compressible (~12.6KB per page of 10
// job orders uncompressed).
app.use(compression());
app.use(bodyParser.json());

// Health must stay reachable for uptime checks, so it is registered before the
// limiters rather than being special-cased inside them.
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api', burstLimiter, sustainedLimiter);
app.use('/api/auth/register', accountLimiter);
app.use('/api/users', accountLimiter);
app.use('/api/jo', joRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/personnel', personnelRoutes);
app.use('/api/completion', completionRoutes);
app.use('/api/approval', approvalRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/job-orders', jobOrdersRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/inventory', inventoryRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`));
