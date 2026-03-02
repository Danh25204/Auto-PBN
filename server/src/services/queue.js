import { runPbnJob } from './puppeteer.js';

/**
 * In-memory job store.
 * job: { id, status, total, completed, failed, results[], listeners }
 */
const jobs = new Map();

/**
 * Start a new posting job (Puppeteer mode).
 *
 * @param {string} jobId
 * @param {string} siteUrl  - e.g. https://88vns.net
 * @param {Array}  posts    - [{ title, content }]
 */
export function startJob(jobId, siteUrl, posts) {
  const job = {
    id: jobId,
    status: 'running',
    total: posts.length,
    completed: 0,
    failed: 0,
    results: [],
    listeners: new Set(),
  };

  jobs.set(jobId, job);

  const emit = (event, data) => {
    // Buffer events so late-connecting SSE clients can catch up
    job.results.push({ event, data });
    job.listeners.forEach((fn) => fn(event, data));
  };

  // Run Puppeteer job in background (no await — non-blocking)
  runPbnJob(jobId, siteUrl, posts, emit)
    .catch((err) => {
      console.error(`[job:${jobId}] Unexpected error:`, err.message);
      emit('error', { message: err.message });
    })
    .finally(() => {
      job.status = 'done';
      // Clean up after 10 minutes
      setTimeout(() => jobs.delete(jobId), 10 * 60 * 1000);
    });
}

export function getJob(jobId) {
  return jobs.get(jobId) || null;
}
