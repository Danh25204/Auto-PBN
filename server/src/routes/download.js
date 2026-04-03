import { Router } from 'express';
import { createReadStream } from 'fs';
import { access } from 'fs/promises';
import { LOG_FILE, PERMALINK_FILE } from '../services/logger.js';

export const downloadRouter = Router();

// ── GET /api/posts.txt ────────────────────────────────────────────
downloadRouter.get('/posts.txt', async (req, res) => {
  try {
    await access(LOG_FILE);
  } catch {
    return res.status(404).json({ error: 'No posts logged yet' });
  }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="posts.txt"');
  createReadStream(LOG_FILE).pipe(res);
});

// ── GET /api/permalinks.txt ───────────────────────────────────────
downloadRouter.get('/permalinks.txt', async (req, res) => {
  try {
    await access(PERMALINK_FILE);
  } catch {
    return res.status(404).json({ error: 'No permalinks logged yet' });
  }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', 'inline; filename="permalinks.txt"');
  createReadStream(PERMALINK_FILE).pipe(res);
});
