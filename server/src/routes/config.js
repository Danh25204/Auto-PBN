import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');

const SITES_FILE    = path.join(DATA_DIR, 'sites.json');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); }
  catch { return {}; }  // settings default to object, not array
}

function readJsonArr(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); }
  catch { return []; }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

export const configRouter = Router();

// ══ SITES ════════════════════════════════════════════════════════════════════

// GET /api/config/sites
configRouter.get('/sites', (_req, res) => {
  res.json(readJsonArr(SITES_FILE));
});

// POST /api/config/sites  { url }
configRouter.post('/sites', (req, res) => {
  const { url } = req.body;
  if (!url || !/^https?:\/\/.+/.test(url.trim())) {
    return res.status(400).json({ error: 'URL không hợp lệ' });
  }
  const sites = readJsonArr(SITES_FILE);
  const clean = url.trim().replace(/\/$/, '');
  if (sites.includes(clean)) {
    return res.status(409).json({ error: 'URL đã tồn tại' });
  }
  sites.push(clean);
  writeJson(SITES_FILE, sites);
  res.status(201).json(sites);
});

// DELETE /api/config/sites  { url }
configRouter.delete('/sites', (req, res) => {
  const { url } = req.body;
  const sites = readJsonArr(SITES_FILE).filter((s) => s !== url);
  writeJson(SITES_FILE, sites);
  res.json(sites);
});

// ══ ACCOUNTS ════════════════════════════════════════════════════════════════

// GET /api/config/accounts  — trả về danh sách, CHE password
configRouter.get('/accounts', (_req, res) => {
  const accounts = readJsonArr(ACCOUNTS_FILE);
  // Không trả về password thực, chỉ trả label + username + id
  const safe = accounts.map(({ username, label }, idx) => ({ idx, username, label }));
  res.json(safe);
});

// POST /api/config/accounts  { username, password, label? }
configRouter.post('/accounts', (req, res) => {
  const { username, password, label } = req.body;
  if (!username?.trim() || !password) {
    return res.status(400).json({ error: 'username và password không được để trống' });
  }
  const accounts = readJsonArr(ACCOUNTS_FILE);
  const entry = {
    username: username.trim(),
    password,
    label: label?.trim() || username.trim(),
  };
  accounts.push(entry);
  writeJson(ACCOUNTS_FILE, accounts);
  // Trả về danh sách safe (không có password)
  res.status(201).json(accounts.map(({ username, label }, idx) => ({ idx, username, label })));
});

// DELETE /api/config/accounts  { idx }
configRouter.delete('/accounts', (req, res) => {
  const { idx } = req.body;
  const accounts = readJsonArr(ACCOUNTS_FILE);
  accounts.splice(idx, 1);
  writeJson(ACCOUNTS_FILE, accounts);
  res.json(accounts.map(({ username, label }, i) => ({ idx: i, username, label })));
});

// GET /api/config/accounts/:idx/credentials
configRouter.get('/accounts/:idx/credentials', (req, res) => {
  const accounts = readJsonArr(ACCOUNTS_FILE);
  const account = accounts[Number(req.params.idx)];
  if (!account) return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
  res.json({ username: account.username, password: account.password });
});

// ═ SETTINGS ════════════════════════════════════════════════════

// GET /api/config/settings
configRouter.get('/settings', (_req, res) => {
  const s = readJson(SETTINGS_FILE);
  // Mask API key: chỉ trả có/không, không lộ key
  res.json({ hasPexelsKey: !!(s.pexelsKey), pexelsKeyPreview: s.pexelsKey ? s.pexelsKey.slice(0,6)+'…' : '' });
});

// PUT /api/config/settings  { pexelsKey }
configRouter.put('/settings', (req, res) => {
  const current = readJson(SETTINGS_FILE);
  const { pexelsKey } = req.body;
  if (pexelsKey !== undefined) current.pexelsKey = pexelsKey.trim();
  writeJson(SETTINGS_FILE, current);
  res.json({ ok: true });
});
