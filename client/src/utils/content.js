// ── Dùng chung bởi ArticlePreview và WorkflowPanel ───────────────────────────

// Lấy domain key (không TLD): "techlearningpro.site" → "techlearningpro"
// "chain-tracker.net" → "chain-tracker"
export function extractDomainKey(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return hostname.replace(/\.[a-z]{2,6}$/, '').toLowerCase();
  } catch { return ''; }
}

// Keyword để TÌM trong bài: bỏ TLD, thay ký tự đặc biệt bằng dấu cách
// "chain-tracker.net" → "chain tracker" | "techlearningpro.site" → "techlearningpro"
export function domainKeywords(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return hostname
      .replace(/\.[a-z]{2,6}$/, '')
      .replace(/[-_.]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  } catch { return ''; }
}

// ── Trích câu chứa keyword từ nội dung HTML ────────────────────────────────
// Tìm keyword trong plain-text, lấy từ đó đến hết câu thứ N (dấu . ! ?)
// Dùng cho meta_description và alt text
// maxChars: giới hạn độ dài đầu ra (default 160)
// sentences: số câu tối đa lấy sau keyword (default 2)
export function extractKeywordSentence(html, keyword, maxChars = 160, sentences = 2) {
  if (!keyword || !html) return '';
  // Bỏ thẻ HTML → plain text, chuẩn hóa khoảng trắng
  const plain = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const lower = plain.toLowerCase();
  const kwLow = keyword.toLowerCase();

  // Tìm chính xác trước
  let idx = lower.indexOf(kwLow);

  // Nếu không thấy và keyword có dấu cách → thử tìm phiên bản liền (vd: "789 BET" → "789bet")
  if (idx === -1 && keyword.includes(' ')) {
    const compact = kwLow.replace(/\s+/g, '');
    idx = lower.indexOf(compact);
  }

  // Nếu vẫn không thấy và keyword không có dấu cách → flex match (vd: "devlearninghub" → "DevLearning Hub")
  if (idx === -1 && !keyword.includes(' ')) {
    // Flex match chỉ cho keyword không có khoảng trắng (domain style)
    const flexReg = new RegExp(
      kwLow.split('').map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s\\-]*'),
      'i'
    );
    const m = flexReg.exec(plain);
    if (m) idx = m.index; else return '';
  }

  if (idx === -1) return ''; // keyword không tìm thấy trong bài bằng bất kỳ cách nào

  // Lấy từ vị trí keyword đến hết `sentences` câu
  const tail = plain.slice(idx);
  const ends = [...tail.matchAll(/[.!?]/g)];
  let endIdx;
  if (ends.length >= sentences) {
    endIdx = ends[sentences - 1].index + 1;
  } else if (ends.length > 0) {
    endIdx = ends[ends.length - 1].index + 1;
  } else {
    endIdx = tail.length;
  }
  return tail.slice(0, Math.min(endIdx, maxChars)).trim();
}

// ── processContent: chèn link + ảnh trước khi đăng ──────────────────────────
export function processContent(html, linkCfg, imgCfg) {
  let content = html || '';
  linkCfg = linkCfg || {};
  imgCfg  = imgCfg  || {};

  // 1. Chèn anchor link
  if (linkCfg.url && linkCfg.url.trim() && (linkCfg.keyword || '').trim()) {
    const targetUrl = linkCfg.url.trim();
    // Nếu keyword vô tình được lưu là URL đầy đủ → rút domain key (không TLD)
    let searchTerm = linkCfg.keyword.trim();
    if (/^https?:\/\//.test(searchTerm)) {
      try {
        const hn = new URL(searchTerm).hostname.replace(/^www\./, '');
        searchTerm = hn.replace(/\.[a-z]{2,6}$/, '').replace(/[-_.]+/g, ' ').trim().toLowerCase();
      } catch { /* giữ nguyên */ }
    }
    const relAttr   = linkCfg.rel === 'nofollow' ? ' rel="nofollow"' : '';
    const count     = Math.max(1, parseInt(linkCfg.count) || 1);
    const isUrlMode = linkCfg.anchorType === 'url';

    // Chỉ chèn từ giữa bài trở xuống (bỏ qua 40% đầu tính theo thẻ </p>)
    const allParas  = [...content.matchAll(/<\/p>/gi)];
    const skipUntil = allParas.length > 2
      ? (allParas[Math.floor(allParas.length * 0.4)]?.index ?? 0)
      : 0;
    const head = content.slice(0, skipUntil);
    let   tail = content.slice(skipUntil);

    let replaced = 0;
    const searchLower = searchTerm.toLowerCase();
    const hasSpace = searchTerm.includes(' ');

    // Flex regex: cho keyword KHÔNG có khoảng trắng (vd: "devlearninghub" → "DevLearning Hub")
    const flexRegex = !hasSpace
      ? new RegExp(
          searchTerm.toLowerCase()
            .split('')
            .map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('[\\s\\-]*'),
          'i'
        )
      : null;

    // Compact fallback: keyword CÓ khoảng trắng (vd: "789 BET") → thử tìm "789BET" (không dấu cách)
    // Xảy ra khi AI viết brand name liền, không có dấu cách
    const compactLower = hasSpace ? searchTerm.replace(/\s+/g, '').toLowerCase() : null;

    // Che tiêu đề (h1-h6) để không chèn link vào đó
    const headingMasks = [];
    tail = tail.replace(/<(h[1-6])([^>]*)>([\s\S]*?)<\/\1>/gi, (match) => {
      const idx = headingMasks.length;
      headingMasks.push(match);
      return `\x00H${idx}\x00`;
    });

    tail = tail.replace(/>([^<]+)</g, (match, text) => {
      if (replaced >= count) return match;

      // Ưu tiên vị trí giữa câu (có chữ/số trước keyword); fallback: bất kỳ vị trí nào trong text node
      const hasPrecedingWord = (before) => /[a-zA-ZÀ-ỹ0-9]/.test(before);

      const findOccurrence = () => {
        const textLower = text.toLowerCase();

        // Hàm thử tìm 1 pattern trong text, ưu tiên mid-sentence
        const tryFind = (needle, needleLen) => {
          const len = needleLen ?? needle.length;
          let firstMatch = null; // lưu match đầu tiên tìm thấy (kể cả đầu câu) để fallback
          let sf = 0;
          while (sf < text.length) {
            const idx = textLower.indexOf(needle, sf);
            if (idx === -1) break;
            if (firstMatch === null) firstMatch = { idx, len }; // lưu ngay lần đầu thấy
            if (hasPrecedingWord(text.slice(0, idx))) return { idx, len }; // giữa câu → dùng ngay
            sf = idx + 1;
          }
          // Không có vị trí giữa câu → dùng vị trí đầu tiên tìm thấy (kể cả đầu text node)
          return firstMatch;
        };

        // 1. Tìm chính xác (có/không có khoảng trắng)
        const r1 = tryFind(searchLower);
        if (r1) return r1;

        // 2. Flex regex (keyword không có dấu cách)
        if (flexRegex) {
          let firstFlex = null;
          flexRegex.lastIndex = 0;
          let m;
          while ((m = flexRegex.exec(text)) !== null) {
            if (firstFlex === null) firstFlex = { idx: m.index, len: m[0].length };
            if (hasPrecedingWord(text.slice(0, m.index))) return { idx: m.index, len: m[0].length };
          }
          if (firstFlex) return firstFlex;
        }

        // 3. Compact fallback: keyword có dấu cách → thử tìm phiên bản liền ("789 BET" → "789bet")
        if (compactLower) {
          const r3 = tryFind(compactLower, compactLower.length);
          if (r3) return r3;
        }

        return null;
      };

      const occ = findOccurrence();
      if (!occ) return match;

      const { idx: matchIdx, len: matchLen } = occ;
      const before = text.slice(0, matchIdx);
      const found  = text.slice(matchIdx, matchIdx + matchLen);
      const after  = text.slice(matchIdx + matchLen);
      replaced++;

      // keyword mode: bọc từ tìm được bằng link, anchor = anchorDisplay (hoặc từ tìm được)
      // url mode:     giữ keyword + thêm " tại <a>url</a>"
      //               Ví dụ: "xx88" → "xx88 tại <a href='url'>https://xx88.vin/</a>"
      if (isUrlMode) {
        return `>${before}${found} tại <a href="${targetUrl}"${relAttr}>${targetUrl}</a>${after}<`;
      } else {
        const display = linkCfg.anchorDisplay?.trim() || found;
        return `>${before}<a href="${targetUrl}"${relAttr}>${display}</a>${after}<`;
      }
    });

    // Khôi phục tiêu đề
    tail = tail.replace(/\x00H(\d+)\x00/g, (_, i) => headingMasks[+i]);
    content = head + tail;
  }

  // 2. Chèn ảnh
  if (imgCfg.url && imgCfg.url.trim()) {
    const imgUrl = imgCfg.url.trim();
    const imgTag = `<p><img src="${imgUrl}" alt="${imgCfg.alt || ''}" style="max-width:100%;height:auto;" /></p>`;
    const pos    = imgCfg.position || 'random';
    const matches = [...content.matchAll(/<\/p>/gi)];
    if (matches.length > 0) {
      let insertIdx;
      if (pos === 'first') insertIdx = 0;
      else if (pos === 'last') insertIdx = matches.length - 1;
      else {
        const from = Math.max(0, Math.floor(matches.length * 0.3));
        const to   = Math.min(matches.length - 1, Math.ceil(matches.length * 0.7));
        insertIdx  = from + Math.floor(Math.random() * (to - from + 1));
      }
      const insertAt = matches[insertIdx].index + '</p>'.length;
      content = content.slice(0, insertAt) + imgTag + content.slice(insertAt);
    } else {
      content += imgTag;
    }
  }

  return content;
}
