import PQueue from 'p-queue';
import { createWpPost } from './wpApi.js';
import { appendPostLog } from './logger.js';

const CONCURRENCY = parseInt(process.env.CONCURRENCY || '5', 10);

/**
 * In-memory job store.
 * Each job: { id, status, total, completed, failed, results[], emitter }
 * Cleared from memory once the SSE client disconnects (see routes/jobs.js).
 */
const jobs = new Map();

/**
 * Start a new posting job.
 *
 * @param {string} jobId
 * @param {Array}  sites  - validated site objects { url, username, appPassword }
 * @param {object} post   - { title, content, status }
 * @returns {void}        - job runs in background; progress via in-memory store
 */
export function startJob(jobId, sites, post) {
  const queue = new PQueue({ concurrency: CONCURRENCY });

  const job = {
    id: jobId,
    status: 'running',
    total: sites.length,
    completed: 0,
    failed: 0,
    results: [],
    // Listeners registered by the SSE route
    listeners: new Set(),
  };

  jobs.set(jobId, job);

  const emit = (event, data) => {
    job.listeners.forEach((fn) => fn(event, data));
  };

  // Enqueue one task per site
  for (const site of sites) {
    queue.add(async () => {
      const date = new Date().toISOString();
      try {
        const postUrl = await createWpPost(site, post);

        job.completed += 1;
        const result = { siteUrl: site.url, status: 'ok', postUrl };
        job.results.push(result);

        await appendPostLog({ siteUrl: site.url, postUrl, status: post.status, date });

        emit('progress', {
          ...result,
          index: job.completed + job.failed,
          total: job.total,
        });
      } catch (err) {
        job.failed += 1;
        const errorMsg = formatError(err);
        const result = { siteUrl: site.url, status: 'error', error: errorMsg };
        job.results.push(result);

        await appendPostLog({
          siteUrl: site.url,
          postUrl: `ERROR: ${errorMsg}`,
          status: 'failed',
          date,
        });

        emit('progress', {
          ...result,
          index: job.completed + job.failed,
          total: job.total,
        });
      }
    });
  }

  // When all tasks finish
  queue.onIdle().then(() => {
    job.status = 'done';
    emit('done', {
      completed: job.completed,
      failed: job.failed,
      total: job.total,
    });
    // Schedule cleanup after 5 minutes to free memory
    setTimeout(() => jobs.delete(jobId), 5 * 60 * 1000);
  });
}

export function getJob(jobId) {
  return jobs.get(jobId) || null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatError(err) {
  if (err.response) {
    const status = err.response.status;
    const msg =
      err.response.data?.message ||
      err.response.data?.error ||
      err.response.statusText ||
      'Unknown WP API error';
    return `${status} ${msg}`;
  }
  if (err.code === 'ECONNABORTED') return 'Request timed out';
  if (err.code === 'ENOTFOUND') return 'Host not found (DNS failure)';
  return err.message || 'Unknown error';
}
