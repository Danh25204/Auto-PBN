import { appendFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR       = join(__dirname, '..', '..', 'data');
const LOG_FILE       = join(DATA_DIR, 'posts.txt');
const PERMALINK_FILE = join(DATA_DIR, 'permalinks.txt');

/**
 * Append a result line to data/posts.txt.
 * Also appends only the permalink to data/permalinks.txt when status=publish.
 */
export async function appendPostLog({ siteUrl, postUrl, status, date }) {
  const line =
    `Site: ${siteUrl} | Post: ${postUrl} | Status: ${status} | Date: ${date}\n`;

  try {
    await mkdir(DATA_DIR, { recursive: true });
    await appendFile(LOG_FILE, line, 'utf8');
    // Chỉ lưu permalink khi publish thành công
    if (status === 'publish' && postUrl && !postUrl.startsWith('ERROR')) {
      await appendFile(PERMALINK_FILE, postUrl + '\n', 'utf8');
    }
  } catch (err) {
    console.error('[logger] Failed to write log:', err.message);
  }
}

export { LOG_FILE, PERMALINK_FILE };
