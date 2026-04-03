/**
 * PipelineQueue — Song song hoá quá trình viết bài + đăng bài.
 *
 * Kiến trúc:
 *   WRITE WORKERS (concurrency = 2) ──→ readyQueue ──→ PUBLISH WORKER (concurrency = 1)
 *
 * Không chạm vào bất kỳ code hiện có — chỉ import (read-only) từ:
 *   - articleGenerator.js  (generateSingleArticle)
 *   - puppeteer.js         (runPbnJob)
 *   - logger.js            (appendPostLog)
 *
 * Mỗi pipeline job nhận một mảng items:
 *   { siteUrl, username, password, topic, keyword, targetUrl, anchor, anchorRel, model,
 *     imageUrl?, imageAlt? }
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateSingleArticle } from './articleGenerator.js';
import { runPbnJob } from './puppeteer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ACCOUNTS_FILE = path.resolve(__dirname, '../../data/accounts.json');

// ── Helpers ───────────────────────────────────────────────────────────────────

function readAccounts() {
  try { return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf-8')); }
  catch { return []; }
}

function resolveCredentials(item) {
  if (item.username && item.password) {
    return { username: item.username, password: item.password };
  }
  if (item.accountIdx !== undefined) {
    const accounts = readAccounts();
    const acc = accounts[item.accountIdx];
    if (acc) return { username: acc.username, password: acc.password };
  }
  throw new Error(`Không tìm thấy credentials cho site ${item.siteUrl}`);
}

// ── In-memory store ───────────────────────────────────────────────────────────

const pipelineJobs = new Map();

export function getPipelineJob(jobId) {
  return pipelineJobs.get(jobId) || null;
}

// ── Core runner ───────────────────────────────────────────────────────────────

/**
 * Khởi động 1 pipeline job.
 * @param {string} jobId
 * @param {Array}  items   - danh sách bài cần viết + đăng
 * @param {number} writeWorkers - số luồng viết song song (mặc định 2)
 */
export function startPipelineJob(jobId, items, writeWorkers = 2) {
  const job = {
    id: jobId,
    status: 'running',
    total: items.length,
    written: 0,
    published: 0,
    failed: 0,
    results: [],       // buffer cho SSE replay
    listeners: new Set(),
  };

  pipelineJobs.set(jobId, job);

  // Dọn dẹp sau 10 phút
  const cleanup = () => setTimeout(() => pipelineJobs.delete(jobId), 10 * 60 * 1000);

  const emit = (event, data) => {
    job.results.push({ event, data });
    job.listeners.forEach((fn) => fn(event, data));
  };

  // Chạy bất đồng bộ, không block response
  _runPipeline(jobId, job, items, emit, writeWorkers)
    .catch((err) => {
      console.error(`[pipeline:${jobId}] Fatal error:`, err.message);
      emit('error-event', { message: err.message });
    })
    .finally(() => {
      job.status = 'done';
      const summary = {
        total: job.total,
        published: job.published,
        failed: job.failed,
      };
      emit('done', summary);
      cleanup();
    });

  return job;
}

async function _runPipeline(jobId, job, items, emit, writeWorkers) {
  emit('status', {
    message: `🚀 Pipeline khởi động: ${items.length} bài · ${writeWorkers} luồng viết · 1 luồng đăng`,
  });

  // readyQueue: bài đã viết xong, chờ đăng
  const readyQueue = [];
  let writesDone = false;

  // ── Publish worker (sequential) ──────────────────────────────────────────
  // Chạy song song với write workers nhưng chỉ 1 Puppeteer tại 1 thời điểm.
  const publisherDone = (async () => {
    while (true) {
      // Chờ có bài trong queue hoặc tất cả write workers xong
      if (readyQueue.length === 0) {
        if (writesDone) break;
        await _sleep(300);
        continue;
      }

      const item = readyQueue.shift();
      await _publishOne(jobId, job, item, emit);
    }
  })();

  // ── Write workers (parallel) ──────────────────────────────────────────────
  // Chia items thành chunks, mỗi worker xử lý 1 item tại 1 lúc (dùng chung pool)
  const todo = [...items];  // shared pool, workers lấy từ đây
  const writerPromises = Array.from({ length: writeWorkers }, (_, wIdx) =>
    _writerWorker(jobId, job, wIdx + 1, todo, readyQueue, emit)
  );

  await Promise.all(writerPromises);
  writesDone = true;
  console.log(`[pipeline:${jobId}] Tất cả write workers hoàn tất, chờ publisher xử lý nốt...`);

  await publisherDone;
}

// ── Writer worker ─────────────────────────────────────────────────────────────

async function _writerWorker(jobId, job, workerIdx, todo, readyQueue, emit) {
  while (todo.length > 0) {
    const item = todo.shift();
    if (!item) break;

    const label = `[pipeline:${jobId}][writer-${workerIdx}] "${item.topic}"`;
    emit('status', { message: `✍️ Đang viết: ${item.topic}` });

    try {
      const article = await generateSingleArticle(
        item.topic,
        item.model || 'gpt-4o-mini',
        item.keyword || '',
        item.language || 'vi' // default to Vietnamese
      );

      if (!article || article.status === 'error') {
        throw new Error(article?.error || 'Generate thất bại');
      }

      job.written++;
      emit('status', { message: `📝 Viết xong (${job.written}/${job.total}): ${article.title}` });
      console.log(`${label} → viết xong [${article.status}]`);

      // Đẩy vào readyQueue để publisher xử lý
      readyQueue.push({ ...item, article });

      // Rate-limit: Tier 1 = ~3 RPM → đợi 3s giữa các lần gọi API trong cùng 1 worker
      await _sleep(3000);

    } catch (err) {
      console.error(`${label} → WRITE FAILED:`, err.message);
      job.failed++;
      emit('progress', {
        status: 'failed',
        title: item.topic,
        siteUrl: item.siteUrl,
        error: err.message,
      });
    }
  }
}

// ── Publish one item ──────────────────────────────────────────────────────────

async function _publishOne(jobId, job, item, emit) {
  const { article, siteUrl, targetUrl, anchor, anchorRel, imageUrl, imageAlt } = item;
  const label = `[pipeline:${jobId}][publisher] "${article.title}"`;

  emit('status', { message: `🌐 Đang đăng: ${article.title} → ${siteUrl}` });

  let credentials;
  try {
    credentials = resolveCredentials(item);
  } catch (err) {
    console.error(`${label} → No credentials:`, err.message);
    job.failed++;
    emit('progress', {
      status: 'failed',
      title: article.title,
      siteUrl,
      error: err.message,
    });
    return;
  }

  // Chuẩn bị post object đúng format runPbnJob expects
  const postPayload = {
    title:            article.title,
    content:          article.content,
    meta_description: article.meta_description || '',
    slug:             article.slug || '',
    keyword:          item.keyword || '',
    targetUrl:        targetUrl || '',
    anchor:           anchor || '',
    anchorRel:        anchorRel || 'dofollow',
    imageUrl:         imageUrl || '',
    imageAlt:         imageAlt || item.keyword || '',
  };

  // emit wrapper để capture progress từ runPbnJob
  const subEmit = (event, data) => {
    if (event === 'progress') {
      if (data.status === 'ok') {
        job.published++;
        emit('progress', {
          ...data,
          siteUrl,
          totalPublished: job.published,
          totalFailed:    job.failed,
          total:          job.total,
        });
      } else if (data.status === 'failed') {
        job.failed++;
        emit('progress', {
          ...data,
          siteUrl,
          totalPublished: job.published,
          totalFailed:    job.failed,
          total:          job.total,
        });
      }
    }
    // Forward status messages
    if (event === 'status') emit('status', data);
  };

  try {
    await runPbnJob(jobId + '_pub_' + Date.now(), siteUrl, credentials.username, credentials.password, [postPayload], subEmit);
    console.log(`${label} → đăng xong`);
  } catch (err) {
    console.error(`${label} → PUBLISH FAILED:`, err.message);
    job.failed++;
    emit('progress', {
      status: 'failed',
      title: article.title,
      siteUrl,
      error: err.message,
    });
  }
}

// ── Util ──────────────────────────────────────────────────────────────────────

function _sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
