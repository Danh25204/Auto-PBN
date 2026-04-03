import { runPbnJob } from './puppeteer.js';

/**
 * In-memory job store.
 * job: { id, status, total, completed, failed, results[], listeners }
 */
const jobs = new Map();

// ── Sequential job queue: chỉ 1 Puppeteer session chạy tại 1 thời điểm ──────
// Mỗi job được xếp hàng; job tiếp theo chỉ bắt đầu sau khi job trước hoàn tất.
let _isRunning = false;
const _queue   = [];

function _runNext() {
  if (_isRunning || _queue.length === 0) return;
  _isRunning = true;
  const { jobId, siteUrl, username, password, posts, job, emit } = _queue.shift();

  job.status = 'running';
  console.log(`[queue] Bắt đầu job ${jobId} → ${siteUrl} (${posts.length} bài | ${_queue.length} job chờ)`);

  runPbnJob(jobId, siteUrl, username, password, posts, emit)
    .catch((err) => {
      console.error(`[job:${jobId}] Lỗi:`, err.message);
      emit('error', { message: err.message });
    })
    .finally(() => {
      job.status = 'done';
      // Clean up sau 10 phút
      setTimeout(() => jobs.delete(jobId), 10 * 60 * 1000);
      _isRunning = false;
      _runNext(); // chạy job kế tiếp
    });
}

/**
 * Thêm job vào hàng đợi tuần tự (concurrency = 1).
 */
export function startJob(jobId, siteUrl, username, password, posts) {
  const job = {
    id: jobId,
    status: 'queued',
    total: posts.length,
    completed: 0,
    failed: 0,
    results: [],
    listeners: new Set(),
  };

  jobs.set(jobId, job);

  const emit = (event, data) => {
    // Buffer events cho SSE client kết nối muộn
    job.results.push({ event, data });
    job.listeners.forEach((fn) => fn(event, data));
  };

  _queue.push({ jobId, siteUrl, username, password, posts, job, emit });
  console.log(`[queue] Job ${jobId} xếp hàng (${_queue.length} chờ, đang chạy: ${_isRunning})`);
  _runNext();
}

export function getJob(jobId) {
  return jobs.get(jobId) || null;
}
