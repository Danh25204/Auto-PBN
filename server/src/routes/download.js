import { Router } from 'express';
import { createReadStream } from 'fs';
import { access } from 'fs/promises';
import { LOG_FILE } from '../services/logger.js';

export const downloadRouter = Router();

// ── GET /api/posts.txt ─────────────────────────────────────────────────────
downloadRouter.get('/posts.txt', async (req, res) => {
  try {
    await access(LOG_FILE); // throws if file doesn't exist
  } catch {
    return res.status(404).json({ error: 'No posts logged yet' });
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="posts.txt"');
  createReadStream(LOG_FILE).pipe(res);
});
