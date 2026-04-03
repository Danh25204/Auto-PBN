import { useState, useEffect } from 'react';

async function apiFetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Lỗi không xác định');
  }
  return res.json();
}

// ── Panel quản lý danh sách (chung cho Sites & Accounts) ─────────────────────
function ListManager({ title, items, renderItem, renderAddForm, onDelete }) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</span>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="text-xs bg-indigo-700 hover:bg-indigo-600 text-white px-2 py-0.5 rounded transition-colors"
        >
          {showAdd ? '✕ Đóng' : '+ Thêm'}
        </button>
      </div>

      {showAdd && (
        <div className="mb-3">
          {renderAddForm(() => setShowAdd(false))}
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-gray-600 italic">Chưa có mục nào. Bấm + Thêm để bắt đầu.</p>
      ) : (
        <ul className="flex flex-col gap-1 max-h-48 overflow-y-auto">
          {items.map((item, i) => (
            <li key={i} className="flex items-center justify-between gap-2 py-1 px-2 bg-gray-900/60 rounded text-xs group">
              <span className="truncate text-gray-200">{renderItem(item)}</span>
              <button
                type="button"
                onClick={() => onDelete(item, i)}
                className="text-gray-600 hover:text-red-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Xóa"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── AddSiteForm ───────────────────────────────────────────────────────────────
function AddSiteForm({ onAdded, onClose }) {
  const [url, setUrl] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr('');
    setLoading(true);
    try {
      const sites = await apiFetch('/api/config/sites', {
        method: 'POST',
        body: JSON.stringify({ url }),
      });
      onAdded(sites);
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        type="url"
        placeholder="https://example.com"
        value={url}
        onChange={(e) => setUrl(e.target.value.trim())}
        className="input-field text-xs"
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        autoFocus
      />
      {err && <p className="text-red-400 text-xs">{err}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={loading || !url}
        className="text-xs bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 text-white px-3 py-1 rounded"
      >
        {loading ? 'Đang lưu...' : 'Lưu'}
      </button>
    </div>
  );
}

// ── AddAccountForm ────────────────────────────────────────────────────────────
function AddAccountForm({ onAdded, onClose }) {
  const [form, setForm] = useState({ username: '', password: '', label: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const submit = async () => {
    setErr('');
    setLoading(true);
    try {
      const accounts = await apiFetch('/api/config/accounts', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      onAdded(accounts);
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        placeholder="Nhãn hiển thị (vd: admin@88vns)"
        value={form.label}
        onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
        className="input-field text-xs"
        autoFocus
      />
      <input
        type="text"
        placeholder="Tên đăng nhập"
        value={form.username}
        onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.trim() }))}
        className="input-field text-xs"
        autoComplete="off"
      />
      <div className="relative">
        <input
          type={showPass ? 'text' : 'password'}
          placeholder="Mật khẩu"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          className="input-field text-xs pr-10"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setShowPass((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
        >
          {showPass ? '🙈' : '👁'}
        </button>
      </div>
      {err && <p className="text-red-400 text-xs">{err}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={loading || !form.username || !form.password}
        className="text-xs bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 text-white px-3 py-1 rounded"
      >
        {loading ? 'Đang lưu...' : 'Lưu tài khoản'}
      </button>
    </div>
  );
}

// ── SiteSetup (main) ──────────────────────────────────────────────────────────
export default function SiteSetup({
  siteUrl, setSiteUrl,
  accountIdx, setAccountIdx,
  postCount, setPostCount,
  onGenerate, locked,
}) {
  const [sites, setSites] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loadErr, setLoadErr] = useState('');

  // Load danh sách khi mount
  useEffect(() => {
    Promise.all([
      apiFetch('/api/config/sites'),
      apiFetch('/api/config/accounts'),
    ]).then(([s, a]) => {
      setSites(s);
      setAccounts(a);
      // Auto-select nếu chỉ có 1 item
      if (s.length === 1) setSiteUrl(s[0]);
      if (a.length === 1) setAccountIdx(0);
    }).catch((e) => setLoadErr(e.message));
  }, []);

  const handleDeleteSite = async (url) => {
    try {
      const updated = await apiFetch('/api/config/sites', {
        method: 'DELETE',
        body: JSON.stringify({ url }),
      });
      setSites(updated);
      if (siteUrl === url) setSiteUrl('');
    } catch {}
  };

  const handleDeleteAccount = async (_item, idx) => {
    try {
      const updated = await apiFetch('/api/config/accounts', {
        method: 'DELETE',
        body: JSON.stringify({ idx }),
      });
      setAccounts(updated);
      if (accountIdx === idx) setAccountIdx(null);
    } catch {}
  };

  return (
    <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
        ① Cấu hình site &amp; tài khoản
      </h2>

      {loadErr && (
        <p className="text-red-400 text-xs mb-3">⚠ {loadErr}</p>
      )}

      <div className="flex flex-col gap-4">
        {/* ── Danh sách sites ── */}
        <ListManager
          title="Danh sách website"
          items={sites}
          renderItem={(s) => s}
          renderAddForm={(close) => (
            <AddSiteForm
              onAdded={(updated) => setSites(updated)}
              onClose={close}
            />
          )}
          onDelete={handleDeleteSite}
        />

        {/* Chọn site */}
        <div>
          <label className="label">Chọn website cần đăng bài</label>
          <select
            value={siteUrl}
            disabled={locked || sites.length === 0}
            onChange={(e) => setSiteUrl(e.target.value)}
            className="input-field"
          >
            <option value="">-- Chọn website --</option>
            {sites.map((s, i) => (
              <option key={i} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* ── Danh sách accounts ── */}
        <ListManager
          title="Danh sách tài khoản"
          items={accounts}
          renderItem={(a) => `${a.label} (${a.username})`}
          renderAddForm={(close) => (
            <AddAccountForm
              onAdded={(updated) => setAccounts(updated)}
              onClose={close}
            />
          )}
          onDelete={handleDeleteAccount}
        />

        {/* Chọn account */}
        <div>
          <label className="label">Chọn tài khoản đăng nhập</label>
          <select
            value={accountIdx ?? ''}
            disabled={locked || accounts.length === 0}
            onChange={(e) => setAccountIdx(e.target.value === '' ? null : Number(e.target.value))}
            className="input-field"
          >
            <option value="">-- Chọn tài khoản --</option>
            {accounts.map((a, i) => (
              <option key={i} value={i}>{a.label} ({a.username})</option>
            ))}
          </select>
        </div>

        {/* Số bài */}
        <div>
          <label className="label">Số lượng bài viết cần đăng</label>
          <input
            type="number"
            placeholder="Ví dụ: 5"
            min={1}
            max={100}
            value={postCount}
            disabled={locked}
            onChange={(e) => setPostCount(e.target.value)}
            className="input-field"
          />
        </div>

        <button
          onClick={onGenerate}
          disabled={locked}
          className="btn-secondary w-full"
        >
          ✦ Tạo form bài viết
        </button>
      </div>

      <p className="text-xs text-gray-600 mt-3">
        App sẽ tự động đăng nhập bằng tài khoản đã chọn và đăng từng bài.
      </p>
    </section>
  );
}
