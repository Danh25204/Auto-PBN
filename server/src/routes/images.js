import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SETTINGS_FILE = path.resolve(__dirname, '../../data/settings.json');

function getSettings() {
  try { return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')); }
  catch { return {}; }
}

export const imagesRouter = Router();

// GET /api/images/search?q=keyword&per_page=5
// Tìm ảnh từ Pexels theo keyword, trả về mảng { url, thumb, photographer }
imagesRouter.get('/search', async (req, res) => {
  const q         = (req.query.q || '').trim();
  const perPage   = Math.min(parseInt(req.query.per_page) || 3, 10);
  const page      = parseInt(req.query.page) || 1;

  if (!q) return res.status(400).json({ error: 'Thiếu tham số q (keyword)' });

  const { pexelsKey } = getSettings();
  const apiKey = pexelsKey || process.env.PEXELS_API_KEY || '';

  if (!apiKey) {
    return res.status(503).json({
      error: 'Chưa cấu hình Pexels API key.',
      hint: 'Vào phần cài đặt → nhập Pexels API key (đăng ký miễn phí tại pexels.com/api)',
    });
  }

  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=${perPage}&page=${page}&orientation=landscape`;
    const pexRes = await fetch(url, {
      headers: { Authorization: apiKey },
    });

    if (!pexRes.ok) {
      const txt = await pexRes.text();
      return res.status(pexRes.status).json({ error: `Pexels API lỗi ${pexRes.status}: ${txt}` });
    }

    const data = await pexRes.json();
    const photos = (data.photos || []).map(p => ({
      id:           p.id,
      url:          p.src.large2x || p.src.large,   // dùng để chèn vào bài
      thumb:        p.src.medium,                   // thumbnail preview ở UI
      photographer: p.photographer,
      alt:          p.alt || q,
    }));
    res.json({ photos, total_results: data.total_results || 0 });
  } catch (err) {
    console.error('[images/search]', err.message);
    res.status(500).json({ error: err.message });
  }
});
