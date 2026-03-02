import { useState, useRef } from 'react';
import { parseCsv } from '../utils/parseCsv';

export default function SitesPanel({ sites, setSites }) {
  const [form, setForm] = useState({ url: '', username: '', appPassword: '' });
  const [csvError, setCsvError] = useState('');
  const fileRef = useRef(null);

  const handleAdd = () => {
    const url = form.url.trim();
    const username = form.username.trim();
    const appPassword = form.appPassword.trim();

    if (!url || !username || !appPassword) return;
    if (!/^https?:\/\//.test(url)) {
      alert('URL must start with http:// or https://');
      return;
    }
    // Prevent duplicates
    if (sites.some((s) => s.url === url)) {
      alert('This URL is already in the list.');
      return;
    }
    setSites((prev) => [...prev, { url, username, appPassword }]);
    setForm({ url: '', username: '', appPassword: '' });
  };

  const handleRemove = (url) => setSites((prev) => prev.filter((s) => s.url !== url));

  const handleCsvUpload = async (e) => {
    setCsvError('');
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.length === 0) throw new Error('No valid rows found in CSV.');

      // Merge, deduplicating by URL
      setSites((prev) => {
        const existingUrls = new Set(prev.map((s) => s.url));
        const newSites = parsed.filter((s) => !existingUrls.has(s.url));
        return [...prev, ...newSites];
      });
    } catch (err) {
      setCsvError(err.message);
    } finally {
      // Reset file input so the same file can be re-uploaded
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
        ① Sites &amp; Credentials
      </h2>

      {/* Manual input form */}
      <div className="grid grid-cols-1 gap-2 mb-3">
        <input
          type="url"
          placeholder="https://yoursite.com"
          value={form.url}
          onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
          className="input-field"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            className="input-field"
          />
          <input
            type="password"
            placeholder="Application Password"
            value={form.appPassword}
            onChange={(e) => setForm((f) => ({ ...f, appPassword: e.target.value }))}
            className="input-field"
          />
        </div>
        <button
          onClick={handleAdd}
          className="btn-secondary w-full"
        >
          + Add Site
        </button>
      </div>

      {/* CSV Upload */}
      <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-400 hover:text-gray-200 transition-colors">
        <span>📂 Upload sites.csv</span>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleCsvUpload}
        />
      </label>
      {csvError && <p className="text-red-400 text-xs mt-1">{csvError}</p>}
      <p className="text-xs text-gray-600 mt-1">
        CSV format: <code className="text-gray-500">url,username,app_password</code>
      </p>

      {/* Site list */}
      {sites.length > 0 && (
        <ul className="mt-4 space-y-1 max-h-48 overflow-y-auto">
          {sites.map((s) => (
            <li
              key={s.url}
              className="flex items-center justify-between text-xs bg-gray-800 rounded px-3 py-2"
            >
              <span className="truncate max-w-[80%] text-gray-300">{s.url}</span>
              <button
                onClick={() => handleRemove(s.url)}
                className="text-gray-500 hover:text-red-400 transition-colors ml-2"
                title="Remove"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-gray-600 mt-2">{sites.length} site(s) loaded</p>
    </section>
  );
}
