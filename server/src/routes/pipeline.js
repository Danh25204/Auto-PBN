/**
 * Route: /api/pipeline
 *
 * POST /api/pipeline        — tạo pipeline job mới, trả về { jobId }
 * GET  /api/pipeline/:id/stream — SSE stream progress (cùng format với /api/jobs/:id/stream)
 *
 * Body POST:
 * {
 *   writeWorkers: 2,         // số luồng viết song song (tối đa 3 với Tier 1)
 *   items: [
 *     {
 *       siteUrl:    "https://example.com",
 *       accountIdx: 0,         // hoặc username + password trực tiếp
 *       topic:      "...",
 *       keyword:    "...",
 *       targetUrl:  "https://target.com",
 *       anchor:     "anchor text",
 *       anchorRel:  "dofollow",  // hoặc "nofollow"
 *       model:      "gpt-4o-mini",
 *       imageUrl:   "",          // optional
 *       imageAlt:   "",          // optional
 *     }
 *   ]
 * }
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { startPipelineJob, getPipelineJob } from '../services/pipelineQueue.js';

export const pipelineRouter = Router();

// ── POST /api/pipeline ───────────────────────────────────────────────────────
pipelineRouter.post('/', (req, res) => {
  const { items, writeWorkers } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items phải là mảng không rỗng' });
  }

  // Validate từng item
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it.siteUrl || !it.topic) {
      return res.status(400).json({ error: `items[${i}] thiếu siteUrl hoặc topic` });
    }
    if (!it.username && !it.password && it.accountIdx === undefined) {
      return res.status(400).json({ error: `items[${i}] thiếu credentials (username/password hoặc accountIdx)` });
    }
  }

  // Giới hạn workers: Tier 1 OpenAI an toàn nhất với 2, tối đa 3
  const workers = Math.min(Math.max(parseInt(writeWorkers) || 2, 1), 3);

  const jobId = uuidv4();
  startPipelineJob(jobId, items, workers);

  console.log(`[pipeline-route] Job ${jobId} khởi động: ${items.length} bài · ${workers} write workers`);
  return res.status(202).json({ jobId, total: items.length, writeWorkers: workers });
});

// ── GET /api/pipeline/:id/stream (SSE) ──────────────────────────────────────
pipelineRouter.get('/:id/stream', (req, res) => {
  const { id } = req.params;
  const job = getPipelineJob(id);

  if (!job) {
    return res.status(404).json({ error: 'Pipeline job không tồn tại' });
  }

  // SSE headers — giống jobs.js
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Replay buffered events cho client kết nối muộn
  for (const { event, data } of job.results) {
    send(event, data);
  }

  if (job.status === 'done') {
    return res.end();
  }

  // Đăng ký live listener
  const listener = (event, data) => send(event, data);
  job.listeners.add(listener);

  req.on('close', () => {
    job.listeners.delete(listener);
  });
});
