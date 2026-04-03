import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { jobsRouter } from './routes/jobs.js';
import { downloadRouter } from './routes/download.js';
import { configRouter } from './routes/config.js';
import { generateRouter } from './routes/generate.js';
import { imagesRouter } from './routes/images.js';
import { pipelineRouter } from './routes/pipeline.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json({ limit: '10mb' }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/jobs', jobsRouter);
app.use('/api', downloadRouter);
app.use('/api/config', configRouter);
app.use('/api/generate', generateRouter);
app.use('/api/images', imagesRouter);
app.use('/api/pipeline', pipelineRouter); // Pipeline: song song hoá viết + đăng bài
// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[global-error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`[server] Auto PBN backend running at http://127.0.0.1:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`[server] Port ${PORT} đang được dùng — server hiện tại vẫn đang chạy bình thường.`);
    console.log(`[server] Truy cập: http://localhost:5173  (frontend)`);
    process.exit(0); // exit 0 = không phải lỗi
  } else {
    throw err;
  }
});
