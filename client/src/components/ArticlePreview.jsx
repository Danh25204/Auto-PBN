import { useState, useEffect, useMemo } from 'react';
import { extractKeywordSentence } from '../utils/content.js';

// ── Giá trị mặc định ─────────────────────────────────────────────────────────
const EMPTY_LINK = { url: '', anchorType: 'keyword', keyword: '', count: 1, rel: 'dofollow' };
const EMPTY_IMG  = { url: '', alt: '', position: 'random' };

// ── Xử lý content: chèn link + ảnh trước khi đăng ───────────────────────────
function processContent(html, linkCfg, imgCfg) {
  let content = html || '';
  linkCfg = linkCfg || {};
  imgCfg  = imgCfg  || {};

  // 1. Chèn anchor link
  if (linkCfg.url && linkCfg.url.trim() && (linkCfg.keyword || '').trim()) {
    const targetUrl  = linkCfg.url.trim();
    // Nếu keyword vô tình được lưu là URL đầy đủ → rút domain key (không TLD)
    let searchTerm = linkCfg.keyword.trim();
    if (/^https?:\/\//.test(searchTerm)) {
      try {
        const hn = new URL(searchTerm).hostname.replace(/^www\./, '');
        // Bỏ TLD: techlearningpro.site → techlearningpro | chain-tracker.net → chain tracker
        searchTerm = hn.replace(/\.[a-z]{2,6}$/, '').replace(/[-_.]+/g, ' ').trim().toLowerCase();
      } catch { /* giữ nguyên */ }
    }
    const relAttr    = linkCfg.rel === 'nofollow' ? ' rel="nofollow"' : '';
    const count      = Math.max(1, parseInt(linkCfg.count) || 1);
    const isUrlMode  = linkCfg.anchorType === 'url';

    // Chỉ chèn từ giữa bài trở xuống (bỏ qua 40% đầu tính theo thẻ </p>)
    const allParas = [...content.matchAll(/<\/p>/gi)];
    const skipUntil = allParas.length > 2
      ? (allParas[Math.floor(allParas.length * 0.4)]?.index ?? 0)
      : 0;
    const head = content.slice(0, skipUntil);
    let tail = content.slice(skipUntil);

    let replaced = 0;
    const searchLower = searchTerm.toLowerCase();

    // Che tiêu đề (h1-h6) để không chèn link vào đó, chỉ chèn vào thân bài (<p>)
    const headingMasks = [];
    tail = tail.replace(/<(h[1-6])([^>]*)>([\s\S]*?)<\/\1>/gi, (match) => {
      const idx = headingMasks.length;
      headingMasks.push(match);
      return `\x00H${idx}\x00`;
    });

    tail = tail.replace(/>([^<]+)</g, (match, text) => {
      if (replaced >= count) return match;
      const idx = text.toLowerCase().indexOf(searchLower);
      if (idx === -1) return match;

      const before = text.slice(0, idx);
      const found  = text.slice(idx, idx + searchTerm.length); // giữ nguyên case gốc
      const after  = text.slice(idx + searchTerm.length);
      replaced++;

      if (isUrlMode) {
        // Giữ nguyên từ tìm được, thêm " tại <a href="url">url</a>" ngay sau
        return `>${before}${found} tại <a href="${targetUrl}"${relAttr}>${targetUrl}</a>${after}<`;
      } else {
        // Bọc từ tìm được bằng link
        return `>${before}<a href="${targetUrl}"${relAttr}>${found}</a>${after}<`;
      }
    });

    // Khôi phục nội dung tiêu đề
    tail = tail.replace(/\x00H(\d+)\x00/g, (_, i) => headingMasks[+i]);

    content = head + tail;
  }

  // 2. Chèn ảnh
  if (imgCfg.url && imgCfg.url.trim()) {
    const imgUrl = imgCfg.url.trim();
    const imgTag = `<p><img src="${imgUrl}" alt="${imgCfg.alt || ''}" style="max-width:100%;height:auto;" /></p>`;
    const pos = imgCfg.position || 'random';

    // Tìm tất cả vị trí </p>
    const matches = [...content.matchAll(/<\/p>/gi)];
    if (matches.length > 0) {
      let insertIdx;
      if (pos === 'first') insertIdx = 0;
      else if (pos === 'last') insertIdx = matches.length - 1;
      else {
        // Random trong khoảng giữa (tránh dòng đầu và dòng cuối)
        const from = Math.max(0, Math.floor(matches.length * 0.3));
        const to = Math.min(matches.length - 1, Math.ceil(matches.length * 0.7));
        insertIdx = from + Math.floor(Math.random() * (to - from + 1));
      }
      const insertAt = matches[insertIdx].index + '</p>'.length;
      content = content.slice(0, insertAt) + imgTag + content.slice(insertAt);
    } else {
      content += imgTag;
    }
  }

  return content; // end of local stub
}

// ── Form link & ảnh trong từng card ──────────────────────────────────────────
function LinkImgForm({ linkCfg, imgCfg, onSave }) {
  const [link, setLink] = useState({ ...EMPTY_LINK, ...linkCfg });
  const [img,  setImg]  = useState({ ...EMPTY_IMG,  ...imgCfg  });
  const [saved, setSaved] = useState(false);

  useEffect(() => { setLink({ ...EMPTY_LINK, ...linkCfg }); }, [JSON.stringify(linkCfg)]);
  useEffect(() => { setImg({ ...EMPTY_IMG,  ...imgCfg  }); }, [JSON.stringify(imgCfg)]);

  async function handleSave() {
    await onSave({ linkCfg: link, imgCfg: img });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const lk = (f, v) => setLink(p => ({ ...p, [f]: v }));
  const im = (f, v) => setImg (p => ({ ...p, [f]: v }));
  const hasConfig = !!(link.url || img.url);

  return (
    <div className="border-t border-gray-700 px-3 py-3 space-y-3 bg-gray-800/30">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Anchor Link</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="label text-xs">URL đích</label>
          <input className="input-field w-full text-xs" placeholder="https://example.com"
            value={link.url} onChange={e => lk('url', e.target.value)} />
        </div>
        <div>
          <label className="label text-xs">Loại anchor</label>
          <select className="input-field w-full text-xs" value={link.anchorType} onChange={e => lk('anchorType', e.target.value)}>
            <option value="keyword">Anchor = Keyword (bọc keyword bằng link)</option>
            <option value="url">Anchor = URL (chèn "tại url" sau keyword)</option>
          </select>
        </div>
        <div>
          <label className="label text-xs">
            {link.anchorType === 'keyword' ? 'Keyword (sẽ bọc bằng link)' : 'Keyword (sẽ chèn "tại url" sau)'}
          </label>
          <input className="input-field w-full text-xs" placeholder="ví dụ: Crypto Alert"
            value={link.keyword} onChange={e => lk('keyword', e.target.value)} />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="label text-xs">Số lần</label>
            <input type="number" min={1} max={5} className="input-field w-full text-xs"
              value={link.count} onChange={e => lk('count', e.target.value)} />
          </div>
          <div className="flex-1">
            <label className="label text-xs">Rel</label>
            <select className="input-field w-full text-xs" value={link.rel} onChange={e => lk('rel', e.target.value)}>
              <option value="dofollow">dofollow</option>
              <option value="nofollow">nofollow</option>
            </select>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Chèn Ảnh</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="label text-xs">URL ảnh</label>
            <input className="input-field w-full text-xs" placeholder="https://example.com/anh.jpg"
              value={img.url} onChange={e => im('url', e.target.value)} />
          </div>
          <div>
            <label className="label text-xs">Alt text</label>
            <input className="input-field w-full text-xs" placeholder="Mô tả ảnh"
              value={img.alt} onChange={e => im('alt', e.target.value)} />
          </div>
          <div>
            <label className="label text-xs">Vị trí</label>
            <select className="input-field w-full text-xs" value={img.position} onChange={e => im('position', e.target.value)}>
              <option value="random">Ngẫu nhiên (giữa bài)</option>
              <option value="first">Sau đoạn đầu tiên</option>
              <option value="last">Cuối bài</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between gap-2 flex-wrap">
        <div className="text-xs text-gray-500 space-y-0.5">
          {link.url && link.keyword && (
            <p>🔗 {link.anchorType === 'url'
              ? <>{link.keyword} → <span className="text-blue-400">tại {link.url}</span></>
              : <><span className="text-amber-400">{link.keyword}</span> → link {link.url}</>
            }</p>
          )}
          {img.url && (
            <p>🖼 Ảnh: <span className="text-green-400">{img.position === 'random' ? 'giữa bài' : img.position === 'first' ? 'đoạn đầu' : 'cuối bài'}</span></p>
          )}
          {!hasConfig && <p className="italic">Chưa cấu hình</p>}
        </div>
        <button onClick={handleSave}
          className={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${
            saved ? 'bg-green-700 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}>
          {saved ? '✓ Đã lưu' : '💾 Lưu cấu hình'}
        </button>
      </div>
    </div>
  );
}

// ── URL→Article smart matching helpers ──────────────────────────────────────
function extractDomainKey(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    // Remove TLD: .net .com .org .io .vn .co etc.
    return hostname.replace(/\.[a-z]{2,6}$/, '').toLowerCase();
  } catch { return ''; }
}
// hostname -> các phần nối bằng dấu cách (bao gồm TLD)
// gamingdaily.blog -> "gamingdaily blog" | tech-academy.net -> "tech academy net"
function humanizeDomain(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return hostname.replace(/[-_.]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  } catch { return ''; }
}
function normTitle(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}
// Trả về mảng { url, domainKey, article, articleIdx } theo từng URL đầu vào
function buildUrlMapping(urls, articles) {
  const used = new Set();
  return urls.map(url => {
    const rawKey = extractDomainKey(url);           // e.g. "techacademycenter" (lowercase, giữ nguyên)
    const normKey = normTitle(rawKey);              // bỏ nốt ký tự đặc biệt để so khớp
    if (!normKey) return { url, domainKey: '', article: null, articleIdx: -1 };
    let bestIdx = -1, bestScore = 0;
    for (let i = 0; i < articles.length; i++) {
      if (used.has(i)) continue;
      const tn = normTitle(articles[i].title);
      let score = 0;
      if (tn.includes(normKey) && normKey.length >= 4) score = normKey.length * 2;
      else if (normKey.includes(tn) && tn.length >= 5) score = tn.length;
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }
    if (bestIdx >= 0 && bestScore > 0) {
      used.add(bestIdx);
      return { url, domainKey: rawKey, humanizedKey: humanizeDomain(url), article: articles[bestIdx], articleIdx: bestIdx };
    }
    return { url, domainKey: rawKey, humanizedKey: humanizeDomain(url), article: null, articleIdx: -1 };
  });
}

// ── Panel đăng bài đã chọn (chỉ site + account) ───────────────────────────────
function PostPanel({ selectedArticles, onPosted, onSaveArticle }) {
  const [sites,      setSites]      = useState([]);
  const [accounts,   setAccounts]   = useState([]);
  const [siteUrl,    setSiteUrl]    = useState('');
  const [accountIdx, setAccountIdx] = useState('');
  const [posting,    setPosting]    = useState(false);
  const [result,     setResult]     = useState(null);

  // Import URL bulk
  const [showImport,   setShowImport]   = useState(false);
  const [importText,   setImportText]   = useState('');
  const [applying,     setApplying]     = useState(false);
  const [applyResult,  setApplyResult]  = useState(null);
  const [bulkAnchorType, setBulkAnchorType] = useState(''); // '' = giữ nguyên từng bài

  // Chỉnh anchor type hàng loạt
  const [showAnchorBulk,  setShowAnchorBulk]  = useState(false);
  const [anchorEdits,     setAnchorEdits]     = useState({});  // { _idx: 'keyword'|'url' }
  const [savingAnchor,    setSavingAnchor]    = useState(false);
  const [anchorSaveResult, setAnchorSaveResult] = useState(null);

  // Import ảnh hàng loạt
  const [showImgImport,  setShowImgImport]  = useState(false);
  const [pexelsKey,      setPexelsKey]      = useState('');
  const [pexelsOk,       setPexelsOk]       = useState(false);  // đã có key lưu
  const [pexelsPreview,  setPexelsPreview]  = useState('');
  const [savingKey,      setSavingKey]      = useState(false);
  const [imgResults,     setImgResults]     = useState([]);     // [{ article, keyword, photos, selectedIdx }]
  const [fetchingImgs,   setFetchingImgs]   = useState(false);
  const [fetchProgress,  setFetchProgress]  = useState({ done: 0, total: 0 });
  const [applyingImgs,   setApplyingImgs]   = useState(false);
  const [applyImgResult, setApplyImgResult] = useState(null);

  useEffect(() => {
    fetch('/api/config/sites').then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : [];
      setSites(list);
      if (list.length) setSiteUrl(list[0]);
    }).catch(() => {});
    fetch('/api/config/accounts').then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : [];
      setAccounts(list);
      if (list.length) setAccountIdx(0);
    }).catch(() => {});
    // Kiểm tra Pexels key
    fetch('/api/config/settings').then(r => r.json()).then(d => {
      setPexelsOk(!!d.hasPexelsKey);
      setPexelsPreview(d.pexelsKeyPreview || '');
    }).catch(() => {});
  }, []);

  async function handleApplyUrls() {
    const urls = importText.split('\n').map(l => l.trim()).filter(Boolean);
    if (!urls.length) return;
    setApplying(true);
    setApplyResult(null);
    const mapping = buildUrlMapping(urls, selectedArticles);
    let applied = 0, unmatched = 0;
    for (const { url, domainKey, humanizedKey, article } of mapping) {
      if (!article) { unmatched++; continue; }
      const anchorType = bulkAnchorType || article.linkCfg?.anchorType || 'keyword';
      // keyword = domain không TLD, không dấu cách (ví dụ: chaintracker)
      // Nếu keyword hiện tại đang là URL đầy đủ hoặc trống → dùng domainKey
      const existingKw = article.linkCfg?.keyword || '';
      const kwIsUrl = /^https?:\/\//.test(existingKw);
      const keyword = (!existingKw || kwIsUrl) ? domainKey : existingKw;
      const newLinkCfg = { ...(article.linkCfg || {}), url, anchorType, keyword };
      await onSaveArticle(article._idx, { ...article, linkCfg: newLinkCfg });
      applied++;
    }
    setApplyResult({ applied, total: selectedArticles.length, urls: urls.length, unmatched });
    setApplying(false);
    setImportText('');
  }

  // Smart mapping preview (memoized)
  const urlMapping = useMemo(() => {
    const urls = importText.split('\n').map(l => l.trim()).filter(Boolean);
    return buildUrlMapping(urls, selectedArticles);
  }, [importText, selectedArticles]);

  // ── Mở panel anchor bulk: pre-fill từ linkCfg hiện tại của từng bài ──
  function openAnchorBulk() {
    const init = {};
    for (const a of selectedArticles) {
      init[a._idx] = a.linkCfg?.anchorType || 'keyword';
    }
    setAnchorEdits(init);
    setAnchorSaveResult(null);
    setShowAnchorBulk(true);
  }

  function setAllAnchorType(type) {
    setAnchorEdits(prev => {
      const next = { ...prev };
      for (const a of selectedArticles) next[a._idx] = type;
      return next;
    });
  }

  async function handleSaveAnchorBulk() {
    setSavingAnchor(true);
    setAnchorSaveResult(null);
    let saved = 0;
    for (const article of selectedArticles) {
      const newType = anchorEdits[article._idx];
      if (!newType) continue;
      const oldType = article.linkCfg?.anchorType || 'keyword';
      // keyword luôn là từ để TÌM trong bài (humanized domain), không bao giờ là URL
      // anchorType chỉ ảnh hưởng processContent khi chèn (bọc kw hay thêm "tại url")
      let keyword = article.linkCfg?.keyword || '';
      // Nếu keyword đang trống hoặc đang chứa URL đầy đủ → extractDomainKey (không TLD)
      const kwIsUrl = /^https?:\/\//.test(keyword);
      if ((!keyword || kwIsUrl) && article.linkCfg?.url) {
        keyword = extractDomainKey(article.linkCfg.url);
      }
      const newLinkCfg = { ...(article.linkCfg || {}), anchorType: newType, keyword };
      await onSaveArticle(article._idx, { ...article, linkCfg: newLinkCfg });
      saved++;
    }
    setAnchorSaveResult(saved);
    setSavingAnchor(false);
  }

  // ── Pexels key save ──
  async function handleSavePexelsKey() {
    if (!pexelsKey.trim()) return;
    setSavingKey(true);
    try {
      await fetch('/api/config/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pexelsKey: pexelsKey.trim() }),
      });
      setPexelsOk(true);
      setPexelsPreview(pexelsKey.slice(0, 6) + '…');
      setPexelsKey('');
    } finally { setSavingKey(false); }
  }

  // ── Tìm ảnh hàng loạt ──
  // Keyword: dùng linkCfg.keyword nếu có, ngược lại rút từ tiêu đề
  function deriveKeyword(article) {
    if (article.linkCfg?.keyword?.trim()) return article.linkCfg.keyword.trim();
    // Rút 2-3 từ đầu tiêu đề làm keyword tìm ảnh
    return (article.title || '').replace(/[\-–—|]/g, ' ').trim().split(/\s+/).slice(0, 3).join(' ');
  }

  async function handleFetchImages() {
    if (!pexelsOk || fetchingImgs) return;
    setFetchingImgs(true);
    setImgResults([]);
    setApplyImgResult(null);
    const total = selectedArticles.length;
    setFetchProgress({ done: 0, total });
    const results = [];
    for (let i = 0; i < selectedArticles.length; i++) {
      const article = selectedArticles[i];
      const keyword = deriveKeyword(article);
      try {
        const res = await fetch(`/api/images/search?q=${encodeURIComponent(keyword)}&per_page=3`);
        const data = await res.json();
        results.push({ article, keyword, photos: data.photos || [], selectedIdx: 0, error: data.error || null });
      } catch (e) {
        results.push({ article, keyword, photos: [], selectedIdx: 0, error: e.message });
      }
      setFetchProgress({ done: i + 1, total });
      // Small delay để tránh rate-limit
      if (i < selectedArticles.length - 1) await new Promise(r => setTimeout(r, 200));
    }
    setImgResults(results);
    setFetchingImgs(false);
  }

  async function handleApplyImages() {
    if (!imgResults.length || applyingImgs) return;
    setApplyingImgs(true);
    setApplyImgResult(null);
    let applied = 0;
    for (const { article, keyword, photos, selectedIdx } of imgResults) {
      const photo = photos[selectedIdx];
      if (!photo?.url) continue;
      const newImgCfg = { ...(article.imgCfg || {}), url: photo.url, alt: photo.alt || keyword };
      await onSaveArticle(article._idx, { ...article, imgCfg: newImgCfg });
      applied++;
    }
    setApplyImgResult({ applied, total: imgResults.length });
    setApplyingImgs(false);
  }

  async function handlePost() {
    if (!siteUrl || accountIdx === '' || !selectedArticles.length) return;
    setPosting(true);
    setResult(null);
    try {
      // Mỗi bài dùng linkCfg/imgCfg riêng đã lưu trong article
      const posts = selectedArticles.map(a => {
        // Keyword: lấy từ article (do AI tự điền) hoặc từ linkCfg
        const kw = a.keyword || a.linkCfg?.keyword || '';

        // Meta description: trích từ bài (keyword → hết 2 câu, tối đa 160 ký tự)
        const extractedMeta = extractKeywordSentence(a.content, kw, 160, 2)
                           || a.meta_description
                           || '';

        // Alt text: trích từ bài (keyword → hết 1 câu, tối đa 120 ký tự)
        const altText = extractKeywordSentence(a.content, kw, 120, 1) || kw || '';

        // Xây dựng imgCfg: giữ URL cũ nhưng đục alt bằng câu chứa keyword
        const imgCfgWithAlt = a.imgCfg?.url
          ? { ...a.imgCfg, alt: altText || a.imgCfg.alt }
          : a.imgCfg;

        return {
          title:            a.title,
          content:          processContent(a.content, a.linkCfg, imgCfgWithAlt),
          keyword:          kw,
          slug:             a.slug             || '',
          meta_description: extractedMeta,
        };
      });

      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteUrl, accountIdx: Number(accountIdx), posts }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi không xác định');
      setResult({ ok: true, jobId: data.jobId });
      onPosted?.();
    } catch (err) {
      setResult({ ok: false, error: err.message });
    } finally {
      setPosting(false);
    }
  }

  if (!selectedArticles.length) return null;

  const withLink = selectedArticles.filter(a => a.linkCfg?.url).length;
  const withImg  = selectedArticles.filter(a => a.imgCfg?.url).length;

  return (
    <div className="sticky bottom-0 bg-gray-900 border border-blue-600 rounded-xl p-4 shadow-2xl space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-blue-300">Đăng {selectedArticles.length} bài đã chọn</p>
        <div className="flex items-center gap-3">
          <div className="flex gap-2 text-xs">
            {withLink > 0 && <span className="text-amber-400">🔗 {withLink} có link</span>}
            {withImg  > 0 && <span className="text-green-400">🖼 {withImg} có ảnh</span>}
          </div>
          <button
            onClick={() => { setShowImport(v => !v); setApplyResult(null); }}
            className={`text-xs px-2.5 py-1 rounded border transition-colors ${
              showImport ? 'border-amber-500 text-amber-400 bg-amber-950/30' : 'border-gray-600 text-gray-400 hover:text-gray-200'
            }`}
          >
            {showImport ? '▲ Ẩn' : '📥 Import URL đích'}
          </button>
          <button
            onClick={() => { if (!showAnchorBulk) openAnchorBulk(); else setShowAnchorBulk(false); }}
            className={`text-xs px-2.5 py-1 rounded border transition-colors ${
              showAnchorBulk ? 'border-purple-500 text-purple-400 bg-purple-950/30' : 'border-gray-600 text-gray-400 hover:text-gray-200'
            }`}
          >
            {showAnchorBulk ? '▲ Ẩn' : '⛓️ Anchor hàng loạt'}
          </button>
          <button
            onClick={() => { setShowImgImport(v => !v); setApplyImgResult(null); }}
            className={`text-xs px-2.5 py-1 rounded border transition-colors ${
              showImgImport ? 'border-teal-500 text-teal-400 bg-teal-950/30' : 'border-gray-600 text-gray-400 hover:text-gray-200'
            }`}
          >
            {showImgImport ? '▲ Ẩn' : '🖼︎ Import ảnh'}
          </button>
        </div>
      </div>

      {/* Anchor hàng loạt */}
      {showAnchorBulk && (
        <div className="border border-purple-700/50 rounded-lg p-3 space-y-3 bg-purple-950/20">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-purple-300">⛓️ Chỉnh Anchor Type hàng loạt</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Đặt tất cả:</span>
              <button
                onClick={() => setAllAnchorType('keyword')}
                className="text-xs px-2.5 py-1 rounded border border-amber-600 text-amber-400 hover:bg-amber-950/40"
              >Keyword</button>
              <button
                onClick={() => setAllAnchorType('url')}
                className="text-xs px-2.5 py-1 rounded border border-blue-600 text-blue-400 hover:bg-blue-950/40"
              >URL địa chỉ</button>
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1">
            {selectedArticles.map(article => {
              const cur = anchorEdits[article._idx] || article.linkCfg?.anchorType || 'keyword';
              return (
                <div key={article._idx} className="flex items-center gap-2 text-xs py-1 border-b border-gray-800/60 last:border-0">
                  <span className="flex-1 truncate text-gray-300" title={article.title}>{article.title || '(no title)'}</span>
                  {/* Current keyword preview */}
                  <span className="text-gray-600 truncate max-w-[120px]" title={article.linkCfg?.keyword}>
                    {article.linkCfg?.keyword
                      ? <span className="text-gray-500">{article.linkCfg.keyword.slice(0, 20)}{article.linkCfg.keyword.length > 20 ? '…' : ''}</span>
                      : <span className="italic text-gray-700">chưa có kw</span>
                    }
                  </span>
                  {/* Toggle buttons */}
                  <div className="flex shrink-0">
                    <button
                      onClick={() => setAnchorEdits(p => ({ ...p, [article._idx]: 'keyword' }))}
                      className={`text-xs px-2 py-0.5 rounded-l border transition-colors ${
                        cur === 'keyword'
                          ? 'bg-amber-700 border-amber-500 text-amber-200'
                          : 'bg-gray-800 border-gray-600 text-gray-400 hover:text-amber-300'
                      }`}
                    >Keyword</button>
                    <button
                      onClick={() => setAnchorEdits(p => ({ ...p, [article._idx]: 'url' }))}
                      className={`text-xs px-2 py-0.5 rounded-r border-t border-r border-b transition-colors ${
                        cur === 'url'
                          ? 'bg-blue-700 border-blue-500 text-blue-200'
                          : 'bg-gray-800 border-gray-600 text-gray-400 hover:text-blue-300'
                      }`}
                    >URL</button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveAnchorBulk}
              disabled={savingAnchor}
              className="text-xs px-4 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white rounded font-semibold"
            >
              {savingAnchor ? 'Đang lưu...' : `✔ Lưu Anchor cho ${selectedArticles.length} bài`}
            </button>
            {anchorSaveResult !== null && (
              <p className="text-xs text-green-400">✓ Đã lưu {anchorSaveResult} bài</p>
            )}
          </div>
        </div>
      )}

      {/* Import URL bulk */}
      {showImport && (
        <div className="border border-amber-700/50 rounded-lg p-3 space-y-3 bg-amber-950/20">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-amber-300">Import URL đích – tự động khớp theo domain</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Dán danh sách URL (mỗi dòng 1 URL). Hệ thống tự khớp domain với tiêu đề bài viết.
                Ví dụ: <span className="text-amber-400/80">techacademycenter.net</span> → bài có "TechAcademy Center".
              </p>
            </div>
            <label className="shrink-0 text-xs px-2.5 py-1 rounded border border-gray-600 text-gray-400 hover:text-gray-200 cursor-pointer">
              📂 Mở file
              <input type="file" accept=".txt" className="hidden" onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => setImportText(ev.target.result);
                reader.readAsText(file);
                e.target.value = '';
              }} />
            </label>
          </div>

          {/* Bulk anchor type selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 shrink-0">Loại anchor:</span>
            {[['', 'Giữ của từng bài'], ['keyword', 'Keyword'], ['url', 'URL địa chỉ']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setBulkAnchorType(val)}
                className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                  bulkAnchorType === val
                    ? 'border-amber-500 text-amber-300 bg-amber-950/40'
                    : 'border-gray-600 text-gray-400 hover:text-gray-200'
                }`}
              >{label}</button>
            ))}
          </div>

          <textarea
            className="input-field w-full text-xs font-mono resize-y h-28"
            placeholder={`https://example.com/url-1\nhttps://example.com/url-2\nhttps://example.com/url-3\n...`}
            value={importText}
            onChange={e => setImportText(e.target.value)}
          />

          {/* Preview smart matching */}
          {urlMapping.length > 0 && (() => {
            const matched   = urlMapping.filter(m => m.article);
            const unmatched = urlMapping.filter(m => !m.article);
            return (
              <div className="bg-gray-900/70 rounded p-2 max-h-52 overflow-y-auto space-y-1">
                <p className="text-xs text-gray-400 mb-1">
                  {urlMapping.length} URL →
                  <span className="text-green-400 ml-1">✓ {matched.length} khớp</span>
                  {unmatched.length > 0 && <span className="text-red-400 ml-1">· ✗ {unmatched.length} không tìm được bài</span>}
                </p>
                {urlMapping.map(({ url, domainKey, humanizedKey, article }, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="text-gray-500 shrink-0 w-5 text-right">{i + 1}.</span>
                    <span className={`truncate max-w-[140px] shrink-0 ${article ? 'text-blue-400' : 'text-red-400/70'}`} title={url}>
                      {url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                    </span>
                    <span className="shrink-0">→</span>
                    {article
                      ? <span className="text-green-400 truncate flex-1 min-w-0" title={article.title}>
                          ✓ {article.title || '(no title)'}
                          {(() => {
                            const aType = bulkAnchorType || article.linkCfg?.anchorType || 'keyword';
                            if (aType === 'url') {
                              // keyword sẽ = url đầy đủ
                              return <span className="text-blue-400/70 ml-1" title={url}>[anchor: {url.replace(/^https?:\/\//, '')}]</span>;
                            }
                            const kw = article.linkCfg?.keyword || humanizedKey;
                            return kw ? <span className="text-amber-400/80 ml-1">[kw: {kw}]</span> : null;
                          })()}
                        </span>
                      : <span className="text-red-400/60 italic flex-1">✗ Không tìm thấy bài phù hợp</span>
                    }
                  </div>
                ))}
              </div>
            );
          })()}

          <div className="flex items-center gap-3">
            <button
              onClick={handleApplyUrls}
              disabled={applying || !urlMapping.some(m => m.article)}
              className="text-xs px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded font-semibold"
            >
              {applying ? 'Đang áp dụng...' : `✔ Áp dụng ${urlMapping.filter(m => m.article).length} URL`}
            </button>
            {applyResult && (
              <p className="text-xs text-green-400">
                ✓ Đã gán {applyResult.applied}/{applyResult.total} bài
                {applyResult.unmatched > 0 && <span className="text-amber-400 ml-1">· {applyResult.unmatched} URL không khớp bài nào</span>}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Import ảnh hàng loạt */}
      {showImgImport && (
        <div className="border border-teal-700/50 rounded-lg p-3 space-y-3 bg-teal-950/20">
          <div>
            <p className="text-xs font-semibold text-teal-300">🖼︎ Tìm ảnh tự động theo chủ đề bài (Pexels)</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Keyword tìm ảnh lấy từ ô "Keyword" trong cài đặt ảnh của từng bài (hoặc 3 từ đầu tiêu đề nếu chưa có).
            </p>
          </div>

          {/* Pexels API key setup */}
          {!pexelsOk ? (
            <div className="bg-gray-800/60 rounded p-3 space-y-2">
              <p className="text-xs text-amber-400">⚠️ Chưa có Pexels API key. Đăng ký miễn phí tại{' '}
                <a href="https://www.pexels.com/api/" target="_blank" rel="noopener" className="underline text-blue-400">pexels.com/api</a>
              </p>
              <div className="flex gap-2">
                <input
                  className="input-field flex-1 text-xs font-mono"
                  placeholder="Dán API key vào đây..."
                  value={pexelsKey}
                  onChange={e => setPexelsKey(e.target.value)}
                />
                <button
                  onClick={handleSavePexelsKey}
                  disabled={savingKey || !pexelsKey.trim()}
                  className="text-xs px-3 py-1.5 bg-teal-700 hover:bg-teal-600 disabled:opacity-40 text-white rounded"
                >
                  {savingKey ? 'Lưu...' : '💾 Lưu key'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">Pexels key: <span className="text-teal-400 font-mono">{pexelsPreview}</span></span>
              <button
                onClick={() => setPexelsOk(false)}
                className="text-xs text-gray-500 hover:text-gray-300 underline"
              >Thay key</button>
              <button
                onClick={handleFetchImages}
                disabled={fetchingImgs}
                className="ml-auto text-xs px-4 py-1.5 bg-teal-700 hover:bg-teal-600 disabled:opacity-40 text-white rounded font-semibold"
              >
                {fetchingImgs
                  ? `🔍 Tìm... ${fetchProgress.done}/${fetchProgress.total}`
                  : `🔍 Tìm ảnh cho ${selectedArticles.length} bài`
                }
              </button>
            </div>
          )}

          {/* Kết quả preview */}
          {imgResults.length > 0 && (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {imgResults.map((row, ri) => (
                <div key={ri} className="flex items-start gap-2 bg-gray-800/50 rounded p-2">
                  {/* Thumbnail của ảnh đang chọn */}
                  <div className="shrink-0 w-20 h-14 rounded overflow-hidden bg-gray-700">
                    {row.photos[row.selectedIdx]?.thumb
                      ? <img src={row.photos[row.selectedIdx].thumb} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                          {row.error ? '❌' : 'Không có'}
                        </div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300 truncate" title={row.article.title}>{row.article.title}</p>
                    <p className="text-xs text-teal-400/70">kw: {row.keyword}</p>
                    {row.error && <p className="text-xs text-red-400">{row.error}</p>}
                    {/* Chọn 1 trong 3 ảnh */}
                    {row.photos.length > 1 && (
                      <div className="flex gap-1 mt-1">
                        {row.photos.map((p, pi) => (
                          <button
                            key={pi}
                            onClick={() => setImgResults(prev => prev.map((r, i) => i === ri ? { ...r, selectedIdx: pi } : r))}
                            className={`w-10 h-7 rounded overflow-hidden border-2 transition-colors ${
                              row.selectedIdx === pi ? 'border-teal-400' : 'border-transparent opacity-50 hover:opacity-80'
                            }`}
                          >
                            <img src={p.thumb} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {imgResults.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleApplyImages}
                disabled={applyingImgs || !imgResults.some(r => r.photos[r.selectedIdx]?.url)}
                className="text-xs px-4 py-1.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white rounded font-semibold"
              >
                {applyingImgs ? 'Đang lưu...' : `✔ Áp dụng ${imgResults.filter(r => r.photos[r.selectedIdx]?.url).length} ảnh`}
              </button>
              {applyImgResult && (
                <p className="text-xs text-green-400">✓ Đã gán {applyImgResult.applied}/{applyImgResult.total} bài</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Site + Account + Submit */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className="label text-xs">Website</label>
          <select className="input-field w-full text-sm" value={siteUrl} onChange={e => setSiteUrl(e.target.value)}>
            {sites.length === 0 && <option value="">— Chưa có site —</option>}
            {sites.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="label text-xs">Tài khoản</label>
          <select className="input-field w-full text-sm" value={accountIdx} onChange={e => setAccountIdx(e.target.value)}>
            {accounts.length === 0 && <option value="">— Chưa có tài khoản —</option>}
            {accounts.map((a, i) => <option key={i} value={i}>{a.label || a.username}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={handlePost}
            disabled={posting || !siteUrl || accountIdx === '' || sites.length === 0 || accounts.length === 0}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-40 text-sm font-semibold">
            {posting ? 'Đang khởi động...' : `▶ Đăng ${selectedArticles.length} bài`}
          </button>
        </div>
      </div>

      {result && (
        <p className={`text-xs ${result.ok ? 'text-green-400' : 'text-red-400'}`}>
          {result.ok ? `✓ Job ${result.jobId} đã bắt đầu — xem trình duyệt Edge` : `✗ ${result.error}`}
        </p>
      )}
      {(sites.length === 0 || accounts.length === 0) && (
        <p className="text-xs text-amber-400">⚠ Vui lòng thêm site và tài khoản trong tab "Đăng bài" trước.</p>
      )}
    </div>
  );
}

const MIN_WORDS = 1500;

function wordCount(html) {
  if (!html) return 0;
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;
}

function WordBadge({ count }) {
  const ok = count >= MIN_WORDS;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {count} từ {ok ? '✓' : '⚠ <1500'}
    </span>
  );
}

function ArticleCard({ article, idx, selected, onToggleSelect, onDelete, onRegenerate, onSave }) {
  const [editing,       setEditing]     = useState(false);
  const [showLinkImg,   setShowLinkImg] = useState(false);
  const [draft, setDraft] = useState({ title: article.title, content: article.content, meta_description: article.meta_description });
  const [saving,        setSaving]      = useState(false);
  const [regenerating,  setRegenerating]= useState(false);

  const wc      = wordCount(editing ? draft.content : article.content);
  const hasLink = !!(article.linkCfg?.url);
  const hasImg  = !!(article.imgCfg?.url);

  async function saveEdits() {
    setSaving(true);
    await onSave(idx, draft);
    setSaving(false);
    setEditing(false);
  }

  function cancelEdit() {
    setDraft({ title: article.title, content: article.content, meta_description: article.meta_description });
    setEditing(false);
  }

  async function handleRegenerate() {
    setRegenerating(true);
    await onRegenerate(idx, article.topic);
    setRegenerating(false);
  }

  async function handleSaveLinkImg({ linkCfg, imgCfg }) {
    await onSave(idx, { ...article, linkCfg, imgCfg });
  }

  if (article.status === 'failed') {
    return (
      <div className="border border-red-200 rounded-lg p-4 bg-red-50 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-red-700">✗ Failed: {article.topic}</span>
          <div className="flex gap-2">
            <button onClick={handleRegenerate} disabled={regenerating} className="text-xs px-2 py-1 bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50">
              {regenerating ? 'Đang tạo...' : 'Retry'}
            </button>
            <button onClick={() => onDelete(idx)} className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600">Xóa</button>
          </div>
        </div>
        <p className="text-xs text-red-500">{article.error}</p>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg overflow-hidden transition-colors ${selected ? 'border-blue-500 bg-blue-950/20' : 'border-gray-700'}`}>
      {/* Header */}
      <div className="px-3 py-2.5 flex items-center gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(idx)}
          className="w-4 h-4 accent-blue-500 shrink-0 cursor-pointer"
        />
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              className="w-full text-sm font-semibold bg-gray-800 border border-gray-600 rounded px-2 py-1 text-gray-100"
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            />
          ) : (
            <p className="text-sm font-semibold text-gray-100 truncate" title={article.title}>{article.title || '(no title)'}</p>
          )}
          <p className="text-xs text-gray-500 truncate">{article.topic}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          <WordBadge count={wc} />
          {hasLink && <span className="text-xs text-amber-400" title="Đã cấu hình link">🔗</span>}
          {hasImg  && <span className="text-xs text-green-400" title="Đã cấu hình ảnh">🖼</span>}
          {!editing && (
            <>
              <button
                onClick={() => setShowLinkImg(v => !v)}
                className={`text-xs px-2 py-1 rounded border transition-colors ${showLinkImg
                  ? 'border-amber-500 text-amber-400 bg-amber-950/30'
                  : 'border-gray-600 text-gray-400 hover:text-gray-200'}`}
                title="Cấu hình link & ảnh cho bài này">
                ⚙
              </button>
              <button onClick={() => setEditing(true)} className="text-xs px-2 py-1 btn-secondary">Sửa</button>
              <button onClick={handleRegenerate} disabled={regenerating} className="text-xs px-2 py-1 btn-secondary disabled:opacity-40">
                {regenerating ? '...' : '↺'}
              </button>
              <button onClick={() => onDelete(idx)} className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700">✕</button>
            </>
          )}
          {editing && (
            <>
              <button onClick={saveEdits} disabled={saving} className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                {saving ? 'Lưu...' : 'Lưu'}
              </button>
              <button onClick={cancelEdit} className="text-xs px-2 py-1 btn-secondary">Huỷ</button>
            </>
          )}
        </div>
      </div>

      {/* Link & Image config per article */}
      {showLinkImg && !editing && (
        <LinkImgForm
          linkCfg={article.linkCfg}
          imgCfg={article.imgCfg}
          onSave={handleSaveLinkImg}
        />
      )}

      {/* Content */}
      {editing ? (
        <div className="px-3 pb-3 space-y-2 border-t border-gray-700 pt-2">
          <textarea className="input-field w-full h-52 text-xs font-mono resize-y"
            value={draft.content} onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))} />
          <textarea className="input-field w-full text-xs resize-none" rows={2}
            placeholder="Meta description..."
            value={draft.meta_description} onChange={(e) => setDraft((d) => ({ ...d, meta_description: e.target.value }))} />
        </div>
      ) : (
        <details className="border-t border-gray-700">
          <summary className="px-3 py-1.5 text-xs text-gray-500 cursor-pointer select-none hover:text-gray-300">
            Xem nội dung
          </summary>
          <div className="px-3 pb-3 pt-1 text-sm text-gray-200 prose prose-invert prose-sm max-w-none
            [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold [&_p]:my-1 [&_ul]:my-1"
            dangerouslySetInnerHTML={{ __html: article.content }} />
          {article.meta_description && (
            <div className="mx-3 mb-3 p-2 bg-blue-900/40 rounded text-xs text-blue-300">
              <span className="font-medium">Meta: </span>{article.meta_description}
            </div>
          )}
        </details>
      )}
    </div>
  );
}

export default function ArticlePreview({ onUseArticle, refreshKey }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());

  async function fetchArticles() {
    setLoading(true);
    try {
      const res = await fetch('/api/generate/articles');
      const data = await res.json();
      setArticles(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { fetchArticles(); }, [refreshKey]);

  function toggleSelect(idx) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  function toggleSelectAll() {
    const eligible = articles.map((_, i) => i).filter(i => articles[i].status !== 'failed');
    if (eligible.every(i => selected.has(i))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(eligible));
    }
  }

  async function handleSave(idx, fields) {
    try {
      // Merge với article hiện tại để không mất linkCfg/imgCfg khi chỉ sửa title/content
      const merged = { ...articles[idx], ...fields };
      const res = await fetch(`/api/generate/articles/${idx}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      });
      const data = await res.json();
      if (data.ok) setArticles(prev => prev.map((a, i) => i === idx ? data.article : a));
    } catch {}
  }

  async function handleDelete(idx) {
    if (!window.confirm('Xóa bài viết này?')) return;
    try {
      await fetch(`/api/generate/articles/${idx}`, { method: 'DELETE' });
      setArticles(prev => prev.filter((_, i) => i !== idx));
      setSelected(prev => { const next = new Set(prev); next.delete(idx); return next; });
    } catch {}
  }

  async function handleRegenerate(idx, topic) {
    try {
      const res = await fetch('/api/generate/regenerate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, idx }),
      });
      const data = await res.json();
      if (data.ok) setArticles(prev => prev.map((a, i) => i === idx ? data.article : a));
    } catch {}
  }

  const selectedArticles = [...selected].sort().map(i => ({ ...articles[i], _idx: i })).filter(a => a.title !== undefined);
  const eligibleIdxs = articles.map((_, i) => i).filter(i => articles[i]?.status !== 'failed');
  const allSelected = eligibleIdxs.length > 0 && eligibleIdxs.every(i => selected.has(i));

  if (loading) return <div className="text-sm text-gray-400 py-4">Đang tải...</div>;

  if (!articles.length) return (
    <div className="text-center py-10 text-gray-500 text-sm">
      Chưa có bài viết nào. Generate ở bên trái trước.
    </div>
  );

  const readyCount = articles.filter(a => a.status === 'ready').length;
  const failedCount = articles.filter(a => a.status === 'failed').length;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-400 hover:text-gray-200">
          <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="w-4 h-4 accent-blue-500" />
          Chọn tất cả
        </label>
        <span className="text-xs text-gray-500">
          {readyCount} sẵn sàng{failedCount > 0 ? ` · ${failedCount} lỗi` : ''} · <span className="text-blue-400">{selected.size} đang chọn</span>
        </span>
        <button onClick={fetchArticles} className="ml-auto text-xs btn-secondary">↻ Reload</button>
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {articles.map((article, idx) => (
          <ArticleCard
            key={idx}
            article={article}
            idx={idx}
            selected={selected.has(idx)}
            onToggleSelect={toggleSelect}
            onDelete={handleDelete}
            onRegenerate={handleRegenerate}
            onSave={handleSave}
          />
        ))}
      </div>

      {/* Sticky post panel — chỉ hiện khi có bài được chọn */}
      <PostPanel
        selectedArticles={selectedArticles}
        onPosted={() => setSelected(new Set())}
        onSaveArticle={handleSave}
      />
    </div>
  );
}
