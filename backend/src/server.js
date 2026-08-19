require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { verifyConnection } = require('./db');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const jobRoutes = require('./routes/jobs');
const scoringRoutes = require('./routes/scoring');
const resumeRoutes = require('./routes/resume');
const chatbotRoutes = require('./routes/chatbot');
const companyRoutes = require('./routes/companies');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
app.use(express.json({ limit: '2mb' }));

// General limiter — applies to every route, guards against abusive traffic overall.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down and try again shortly.' },
});
app.use(generalLimiter);

// Stricter limiter on auth — login/signup are the main brute-force targets.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login/signup attempts. Please try again in a few minutes.' },
});

app.get('/health', async (req, res) => {
  const connected = await verifyConnection();
  res.status(connected ? 200 : 503).json({ status: connected ? 'ok' : 'db_unreachable' });
});

app.use('/auth', authLimiter, authRoutes);
app.use('/profile', profileRoutes);
app.use('/jobs', jobRoutes);
app.use('/scoring', scoringRoutes);
app.use('/resume', resumeRoutes);
app.use('/chatbot', chatbotRoutes);
app.use('/companies', companyRoutes);

// Fallback error handler — keeps unhandled errors from crashing the process
// and always returns JSON instead of an HTML stack trace.
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

const PORT = process.env.PORT || 5000;

async function start() {
  const connected = await verifyConnection();
  if (!connected) {
    console.warn('Starting server without a confirmed DB connection — requests will fail until the DB is reachable.');
  }
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

start();
