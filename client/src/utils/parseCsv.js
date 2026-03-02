/**
 * Parse CSV text for WP sites.
 * Expected headers: url, username, app_password  (case-insensitive, order-independent)
 *
 * @param {string} text
 * @returns {{ url: string, username: string, appPassword: string }[]}
 */
export function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.');

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

  const urlIdx = headers.indexOf('url');
  const userIdx = headers.indexOf('username');
  const passIdx = headers.findIndex((h) => h === 'app_password' || h === 'apppassword');

  if (urlIdx === -1) throw new Error('CSV missing column: url');
  if (userIdx === -1) throw new Error('CSV missing column: username');
  if (passIdx === -1) throw new Error('CSV missing column: app_password');

  const results = [];

  for (let i = 1; i < lines.length; i++) {
    // Simple CSV split — handles quoted fields with commas
    const cols = splitCsvLine(lines[i]);
    const url = cols[urlIdx]?.trim();
    const username = cols[userIdx]?.trim();
    const appPassword = cols[passIdx]?.trim();

    if (!url || !username || !appPassword) continue; // skip incomplete rows

    if (!/^https?:\/\//.test(url)) continue; // skip invalid URLs silently

    results.push({ url: url.replace(/\/$/, ''), username, appPassword });
  }

  if (results.length === 0) throw new Error('No valid rows found. Check CSV format.');

  return results;
}

/**
 * Split a CSV line respecting double-quoted fields.
 */
function splitCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
