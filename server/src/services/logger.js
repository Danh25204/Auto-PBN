import { appendFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'data');
const LOG_FILE = join(DATA_DIR, 'posts.txt');

/**
 * Append a result line to data/posts.txt.
 * Creates the directory + file if they don't exist.
 */
export async function appendPostLog({ siteUrl, postUrl, status, date }) {
  const line =
    `Site: ${siteUrl} | Post: ${postUrl} | Status: ${status} | Date: ${date}\n`;

  try {
    await mkdir(DATA_DIR, { recursive: true });
    await appendFile(LOG_FILE, line, 'utf8');
  } catch (err) {
    // Log write failure must not crash the job
    console.error('[logger] Failed to write posts.txt:', err.message);
  }
}

export { LOG_FILE };
