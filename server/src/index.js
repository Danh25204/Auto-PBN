import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { jobsRouter } from './routes/jobs.js';
import { downloadRouter } from './routes/download.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json({ limit: '10mb' }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/jobs', jobsRouter);
app.use('/api', downloadRouter);

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[global-error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[server] Auto PBN backend running at http://127.0.0.1:${PORT}`);
});
