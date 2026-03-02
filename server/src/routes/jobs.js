import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { JobRequestSchema } from '../validation/schemas.js';
import { startJob, getJob } from '../services/queue.js';

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

  const { sites, post } = parsed.data;
  const jobId = uuidv4();

  startJob(jobId, sites, post);
  console.log(`[jobs] Started job ${jobId} → ${sites.length} sites`);

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
  res.setHeader('X-Accel-Buffering', 'no'); // nginx: disable buffering
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Replay any results that arrived before the client connected
  for (const result of job.results) {
    const event = result.status === 'ok' ? 'progress' : 'progress';
    send(event, { ...result, index: job.results.indexOf(result) + 1, total: job.total });
  }

  if (job.status === 'done') {
    send('done', { completed: job.completed, failed: job.failed, total: job.total });
    return res.end();
  }

  // Register live listener
  const listener = (event, data) => send(event, data);
  job.listeners.add(listener);

  // Heartbeat every 20s to prevent proxy timeouts
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 20_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    job.listeners.delete(listener);
  });
});
