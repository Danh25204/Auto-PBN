import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  generateSingleArticle,
  generateBulkSync,
  createBatch,
  getBatchStatus,
} from '../services/articleGenerator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTICLES_FILE = path.resolve(__dirname, '../../../data/articles.json');

// ── Storage helpers ──────────────────────────────────────────────────────────
function readArticles() {
  if (!fs.existsSync(ARTICLES_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(ARTICLES_FILE, 'utf-8')); } catch { return []; }
}

function writeArticles(articles) {
  fs.mkdirSync(path.dirname(ARTICLES_FILE), { recursive: true });
  fs.writeFileSync(ARTICLES_FILE, JSON.stringify(articles, null, 2), 'utf-8');
}

function saveArticles(newItems) {
  const existing = readArticles();
  const merged = [...existing, ...newItems];
  writeArticles(merged);
  return merged;
}

// ── Router ───────────────────────────────────────────────────────────────────
export const generateRouter = Router();

// POST /api/generate/sync  — SSE stream của từng article
generateRouter.post('/sync', async (req, res) => {
  const { topics, keywords: rawKeywords, model, language } = req.body;
  if (!Array.isArray(topics) || topics.length === 0) {
    return res.status(400).json({ error: 'topics phải là mảng string không rỗng' });
  }
  const cleanTopics = topics.map((t) => String(t).trim()).filter(Boolean);
  if (!cleanTopics.length) return res.status(400).json({ error: 'Không có topic hợp lệ' });
  // keywords song song với topics — dùng làm focus keyword khi generate
  const cleanKeywords = Array.isArray(rawKeywords)
    ? rawKeywords.map((k) => String(k || '').trim())
    : [];

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (evt, data) => res.write(`event: ${evt}\ndata: ${JSON.stringify(data)}\n\n`);

  send('start', { total: cleanTopics.length });

  const results = [];
  try {
    await generateBulkSync(
      cleanTopics, 
      model || 'gpt-4o-mini', 
      (idx, total, result) => {
        results.push(result);
        send('article', { idx, total, article: result });
      }, 
      cleanKeywords,
      language || 'vi' // default to Vietnamese
    );

    // Save to file
    const saved = results.filter((r) => r.status === 'ready' || r.status === 'short');
    if (saved.length) saveArticles(saved);

    send('done', { total: cleanTopics.length, saved: saved.length });
  } catch (err) {
    send('error', { message: err.message });
  }

  res.end();
});

// POST /api/generate/batch  — tạo Batch job
generateRouter.post('/batch', async (req, res) => {
  const { topics, model } = req.body;
  if (!Array.isArray(topics) || topics.length === 0) {
    return res.status(400).json({ error: 'topics phải là mảng string không rỗng' });
  }
  const cleanTopics = topics.map((t) => String(t).trim()).filter(Boolean);
  try {
    const info = await createBatch(cleanTopics, model || 'gpt-4o-mini');
    res.json({ ok: true, ...info });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/generate/batch/:id  — poll batch status
generateRouter.get('/batch/:id', async (req, res) => {
  try {
    const info = await getBatchStatus(req.params.id);

    // Nếu done, lưu articles
    if (info.articles?.length) {
      const ready = info.articles.filter((a) => a.status === 'ready' || a.status === 'short');
      if (ready.length) saveArticles(ready);
    }

    res.json({ ok: true, ...info });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/generate/articles  — lấy danh sách articles đã lưu
generateRouter.get('/articles', (_req, res) => {
  res.json(readArticles());
});

// PUT /api/generate/articles/:idx  — cập nhật article (inline edit)
generateRouter.put('/articles/:idx', (req, res) => {
  const idx = parseInt(req.params.idx, 10);
  const articles = readArticles();
  if (isNaN(idx) || idx < 0 || idx >= articles.length) {
    return res.status(404).json({ error: 'Article không tồn tại' });
  }
  const { title, content, meta_description, linkCfg, imgCfg } = req.body;
  if (title !== undefined) articles[idx].title = title;
  if (content !== undefined) articles[idx].content = content;
  if (meta_description !== undefined) articles[idx].meta_description = meta_description;
  if (linkCfg !== undefined) articles[idx].linkCfg = linkCfg;
  if (imgCfg  !== undefined) articles[idx].imgCfg  = imgCfg;

  // Recalculate word count
  const stripped = (articles[idx].content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  articles[idx].wordCount = stripped.split(' ').filter(Boolean).length;
  articles[idx].editedAt = new Date().toISOString();

  writeArticles(articles);
  res.json({ ok: true, article: articles[idx] });
});

// DELETE /api/generate/articles/:idx  — xóa article
generateRouter.delete('/articles/:idx', (req, res) => {
  const idx = parseInt(req.params.idx, 10);
  const articles = readArticles();
  if (isNaN(idx) || idx < 0 || idx >= articles.length) {
    return res.status(404).json({ error: 'Article không tồn tại' });
  }
  articles.splice(idx, 1);
  writeArticles(articles);
  res.json({ ok: true });
});

// POST /api/generate/regenerate  — regenerate 1 topic
generateRouter.post('/regenerate', async (req, res) => {
  const { topic, idx, model, language } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic là bắt buộc' });

  try {
    const article = await generateSingleArticle(
      String(topic).trim(), 
      model || 'gpt-4o-mini',
      '', // focusKeyword
      language || 'vi' // default to Vietnamese
    );
    if (idx !== undefined) {
      const articles = readArticles();
      const i = parseInt(idx, 10);
      if (!isNaN(i) && i >= 0 && i < articles.length) {
        articles[i] = { ...articles[i], ...article };
        writeArticles(articles);
      }
    }
    res.json({ ok: true, article });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
