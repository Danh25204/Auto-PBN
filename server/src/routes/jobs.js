import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JobRequestSchema } from '../validation/schemas.js';
import { startJob, getJob } from '../services/queue.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ACCOUNTS_FILE = path.resolve(__dirname, '../../data/accounts.json');

function readAccounts() {
  try { return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8')); }
  catch { return []; }
}

export const jobsRouter = Router();

// ── POST /api/jobs ─────────────────────────────────────────────────────────
jobsRouter.post('/', (req, res) => {
  const parsed = JobRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { siteUrl, accountIdx, posts } = parsed.data;
  let { username, password } = parsed.data;

  // Nếu chọn từ danh sách → resolve credentials từ file
  if (accountIdx !== undefined) {
    const accounts = readAccounts();
    const account = accounts[accountIdx];
    if (!account) {
      return res.status(400).json({ error: `Không tìm thấy tài khoản #${accountIdx}` });
    }
    username = account.username;
    password = account.password;
  }

  const jobId = uuidv4();
  startJob(jobId, siteUrl, username, password, posts);
  console.log(`[jobs] Started job ${jobId} → ${siteUrl} (${posts.length} posts)`);

  return res.status(202).json({ jobId });
});

// ── GET /api/jobs/:id/stream  (SSE) ────────────────────────────────────────
jobsRouter.get('/:id/stream', (req, res) => {
  const { id } = req.params;
  const job = getJob(id);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Replay buffered events for late-connecting clients
  for (const { event, data } of job.results) {
    send(event, data);
  }

  if (job.status === 'done') {
    return res.end();
  }

  // Register live listener
  const listener = (event, data) => send(event, data);
  job.listeners.add(listener);

  // Heartbeat every 20s
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 20_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    job.listeners.delete(listener);
  });
});

// ── GET /api/jobs/:id/status (Polling fallback) ───────────────────────────
jobsRouter.get('/:id/status', (req, res) => {
  const { id } = req.params;
  const job = getJob(id);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // Đếm số bài completed/failed từ results
  const completed = job.results.filter(r => r.event === 'progress' && r.data.status === 'success').length;
  const failed = job.results.filter(r => r.event === 'progress' && r.data.status === 'error').length;

  if (job.status === 'done') {
    return res.json({ status: 'completed', completed, failed });
  } else if (job.status === 'error') {
    return res.json({ status: 'failed', error: job.error || 'Unknown error', completed, failed });
  } else {
    return res.json({ status: 'running', completed, failed });
  }
});
