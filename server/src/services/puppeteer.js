import puppeteer from 'puppeteer';
import { appendPostLog } from './logger.js';
import PQueue from 'p-queue';
import os from 'os';
import path from 'path';
import fs from 'fs';

const ACTION_TIMEOUT_MS = 20000;

// Global Puppeteer queue: chỉ 1 browser chạy tại 1 thời điểm (tránh xung đột login/đăng bài)
const browserQueue = new PQueue({ concurrency: 1 });

const EDGE_REAL_PROFILE = path.join(
  os.homedir(), 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data'
);
const EDGE_TMP_BASE = path.join(os.tmpdir(), 'autopbn-edge-profiles');

/**
 * Tạo profile Edge riêng cho từng job (tránh conflict khi nhiều Edge cùng mở).
 * Dọn dẹp các profile cũ hơn 2 giờ để không rác disk.
 */
function prepareEdgeProfile(jobId) {
  // Dọn profile cũ (> 2 giờ)
  if (fs.existsSync(EDGE_TMP_BASE)) {
    const cutoff = Date.now() - 2 * 60 * 60 * 1000;
    try {
      for (const entry of fs.readdirSync(EDGE_TMP_BASE)) {
        const p = path.join(EDGE_TMP_BASE, entry);
        const stat = fs.statSync(p);
        if (stat.mtimeMs < cutoff) fs.rmSync(p, { recursive: true, force: true });
      }
    } catch {}
  }

  const profileDir = path.join(EDGE_TMP_BASE, `job-${jobId}`);
  const dstDefault = path.join(profileDir, 'Default');
  fs.mkdirSync(dstDefault, { recursive: true });

  // Copy proxy/network settings từ profile thực (bỏ qua nếu bị lock)
  const srcDefault = path.join(EDGE_REAL_PROFILE, 'Default');
  const filesToCopy = ['Preferences', 'Secure Preferences', 'Network Action Predictor'];
  for (const f of filesToCopy) {
    const src = path.join(srcDefault, f);
    const dst = path.join(dstDefault, f);
    if (fs.existsSync(src)) {
      try { fs.copyFileSync(src, dst); } catch {}
    }
  }
  const localState = path.join(EDGE_REAL_PROFILE, 'Local State');
  if (fs.existsSync(localState)) {
    try { fs.copyFileSync(localState, path.join(profileDir, 'Local State')); } catch {}
  }

  return profileDir;
}

/**
 * Chạy toàn bộ job: mở browser → user login thủ công → đăng từng bài.
 * Được wrap trong browserQueue để đảm bảo chỉ 1 browser tại 1 lúc.
 *
 * @param {string}   jobId
 * @param {string}   siteUrl   - e.g. https://88vns.net
 * @param {string}   username  - WP login username
 * @param {string}   password  - WP login password
 * @param {Array}    posts     - [{ title, content }]
 * @param {Function} emit      - emit(event, data) → SSE
 */
async function _runPbnJobInternal(jobId, siteUrl, username, password, posts, emit) {
  // Chuẩn bị profile Edge riêng cho job này (tránh conflict với Edge đang chạy)
  let profileDir;
  try {
    profileDir = prepareEdgeProfile(jobId);
    console.log(`[puppeteer:${jobId}] Edge profile: ${profileDir}`);
  } catch (e) {
    profileDir = path.join(os.tmpdir(), `autopbn-fallback-${jobId}`);
    fs.mkdirSync(profileDir, { recursive: true });
    console.warn(`[puppeteer:${jobId}] Could not copy Edge profile (${e.message}), using fresh dir`);
  }

  const browser = await puppeteer.launch({
    headless: false,
    executablePath:
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    userDataDir: profileDir,
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--ignore-certificate-errors',
      '--disable-blink-features=AutomationControlled',
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  console.log(`[puppeteer:${jobId}] Edge opened for ${siteUrl}`);

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(ACTION_TIMEOUT_MS);

    // ── Bước 1: Mở trang login ───────────────────────────────────────────────
    try {
      await page.goto(`${siteUrl}/wp-login.php`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
    } catch (navErr) {
      console.warn(`[puppeteer:${jobId}] Navigation failed (${navErr.message}), waiting for manual browse`);
    }

    emit('status', { message: `🔐 Đang đăng nhập vào ${siteUrl}...` });

    // ── Bước 2: Tự động đăng nhập ─────────────────────────────────────────
    await autoLogin(page, siteUrl, username, password);
    
    // Verify login bằng cách vào wp-admin
    try {
      await page.goto(`${siteUrl}/wp-admin/`, {
        waitUntil: 'networkidle2',
        timeout: 25000,
      });
      await new Promise(r => setTimeout(r, 1500));
      
      const stillLoginPage = page.url().includes('wp-login.php');
      if (stillLoginPage) {
        throw new Error('Vẫn ở trang login sau khi đăng nhập — session không tồn tại');
      }
    } catch (e) {
      throw new Error(`Không thể vào wp-admin sau khi login: ${e.message}`);
    }
    
    emit('status', { message: `✅ Đã đăng nhập! Bắt đầu đăng ${posts.length} bài...` });

    let successCount = 0;
    let failCount = 0;

    // ── Bước 3: Đăng từng bài ───────────────────────────────────────────────
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const postNum = i + 1;

      emit('progress', {
        index: postNum,
        total: posts.length,
        status: 'posting',
        title: post.title,
      });

      try {
        // Truy cập thẳng vào trang tạo bài mới
        let navOk = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            await page.goto(`${siteUrl}/wp-admin/post-new.php`, {
              waitUntil: 'domcontentloaded',
              timeout: 25000,
            });
            navOk = true;
            break;
          } catch (e) {
            console.warn(`[puppeteer:${jobId}] post-new.php nav attempt ${attempt} failed: ${e.message}`);
            if (attempt < 3) await new Promise((r) => setTimeout(r, 3000));
          }
        }
        if (!navOk) throw new Error('Không thể mở trang post-new.php sau 3 lần thử');

        // Phát hiện Gutenberg hay Classic editor
        const isGutenberg = await detectGutenberg(page);
        console.log(`[puppeteer:${jobId}] Post ${postNum}: editor=${isGutenberg ? 'Gutenberg' : 'Classic'}`);

        // Xây permalink ngay từ title — domain + slugify(title) giống WP
        const postUrl = `${siteUrl.replace(/\/+$/, '')}/${titleToSlug(post.title)}/`;

        // Publish bài (không cần lấy URL từ page nữa)
        if (isGutenberg) {
          await publishGutenberg(page, post, siteUrl);
        } else {
          await publishClassic(page, post, siteUrl);
        }

        // Bài đã đăng thành công — ghi nhận ngay, không để Rank Math làm ảnh hưởng
        successCount++;
        const date = new Date().toISOString();
        await appendPostLog({ siteUrl, postUrl, status: 'publish', date });

        emit('progress', {
          index: postNum,
          total: posts.length,
          status: 'ok',
          title: post.title,
          postUrl,
        });

        console.log(`[puppeteer:${jobId}] Post ${postNum} OK → ${postUrl}`);

        // ── Gán Focus Keyword, meta description, slug qua WP REST API ──────
        // Non-fatal: nếu lỗi chỉ warn, không tính bài thất bại
        try {
          const postId = await getPostIdFromPage(page);
          await setFocusKeywordMeta(page, siteUrl, postId, post);
          await fillRankMathKeyword(page, post.keyword, isGutenberg);
        } catch (metaErr) {
          console.warn(`[puppeteer:${jobId}] Post ${postNum} meta/keyword lỗi (bài vẫn đăng OK):`, metaErr.message);
        }
      } catch (err) {
        failCount++;
        const errMsg = err.message || 'Unknown error';
        console.error(`[puppeteer:${jobId}] Post ${postNum} FAILED:`, errMsg);

        const date = new Date().toISOString();
        await appendPostLog({ siteUrl, postUrl: `ERROR: ${errMsg}`, status: 'failed', date });

        emit('progress', {
          index: postNum,
          total: posts.length,
          status: 'error',
          title: post.title,
          error: errMsg,
        });
      }
    }

    emit('done', { completed: successCount, failed: failCount, total: posts.length });
  } finally {
    // Đóng browser sau 3s để user có thể thấy kết quả cuối
    setTimeout(() => {
      browser.close().catch(() => {});
      // Dọn profile dir sau khi đóng
      setTimeout(() => {
        try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch {}
      }, 5000);
    }, 3000);
  }
}

// ── Tự động đăng nhập WordPress ────────────────────────────────────────────────────
async function autoLogin(page, siteUrl, username, password) {
  // Chờ field sẵn sàng
  await page.waitForSelector('#user_login', { visible: true, timeout: 15000 });
  await new Promise(r => setTimeout(r, 300));

  // Điền username — dùng evaluate để tránh mất ký tự đầu do timing
  await page.focus('#user_login');
  await new Promise(r => setTimeout(r, 150));
  await page.evaluate((val) => {
    const el = document.querySelector('#user_login');
    el.value = '';
    el.focus();
    // Trigger React/WP input events nếu cần
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, '');
  await page.type('#user_login', username, { delay: 60 });

  // Điền password
  await page.focus('#user_pass');
  await new Promise(r => setTimeout(r, 150));
  await page.evaluate((val) => {
    const el = document.querySelector('#user_pass');
    el.value = '';
    el.focus();
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, '');
  await page.type('#user_pass', password, { delay: 60 });

  // Verify username đã nhập đúng (nếu sai thì thử lại bằng evaluate set trực tiếp)
  const enteredUser = await page.$eval('#user_login', el => el.value);
  if (enteredUser !== username) {
    console.warn(`[autoLogin] Username nhập được "${enteredUser}", expected "${username}" — ghi đè trực tiếp`);
    await page.evaluate((val) => {
      const el = document.querySelector('#user_login');
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, username);
  }

  // Tick "Remember Me" (tùy chọn)
  const rememberMe = await page.$('#rememberme');
  if (rememberMe) {
    const checked = await page.evaluate((el) => el.checked, rememberMe);
    if (!checked) await rememberMe.click();
  }

  // Bấm nút đăng nhập
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 40000 }),
    page.click('#wp-submit'),
  ]);

  // Chờ WP hoàn tất xử lý session và set cookies
  await new Promise(r => setTimeout(r, 3000));

  // Kiểm tra đăng nhập thành công
  let currentUrl = page.url();
  if (currentUrl.includes('wp-login.php')) {
    const errorMsg = await page.evaluate(() => {
      const el = document.querySelector('#login_error');
      return el ? el.innerText.trim() : null;
    });
    throw new Error(errorMsg || 'Đăng nhập thất bại — kiểm tra lại tên đăng nhập và mật khẩu');
  }

  // Kiểm tra cookies đã được set chưa
  const cookies = await page.cookies();
  const wpCookies = cookies.filter(c => c.name.includes('wordpress') || c.name.includes('wp'));
  console.log(`[autoLogin] Cookies sau login: ${wpCookies.length} WP cookies`);
  
  if (wpCookies.length === 0) {
    console.warn('[autoLogin] Không có WP cookies sau login — có thể session không persist');
  }

  // Reload page để đảm bảo cookies được áp dụng
  console.log('[autoLogin] Reload page để áp dụng cookies...');
  await page.reload({ waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));
  
  // Check lại URL sau reload
  currentUrl = page.url();
  if (currentUrl.includes('wp-login.php')) {
    throw new Error('Sau reload vẫn ở login page — cookies không persist');
  }

  console.log('[autoLogin] Đăng nhập thành công!');
}

// ── Phát hiện editor ──────────────────────────────────────────────────────────
async function detectGutenberg(page) {
  try {
    await page.waitForSelector('#editor, #wpcontent', { timeout: 5000 });
    const gutenberg = await page.$('.block-editor-writing-flow, .edit-post-layout, #editor .interface-interface-skeleton');
    return !!gutenberg;
  } catch {
    return false;
  }
}

// ── Làm sạch HTML từ Google Docs / Word ────────────────────────────────────
function cleanHtml(rawHtml) {
  // Giữ lại: p, h1-h6, strong, b, em, i, ul, ol, li, br, a, blockquote, span
  // Xóa: style, class, id, data-* attributes (rác từ Google Docs)
  return rawHtml
    // Xóa toàn bộ thẻ không cần thiết nhưng giữ nội dung bên trong
    .replace(/<(script|style|meta|link|head|html|body)[^>]*>.*?<\/\1>/gis, '')
    // Xóa attributes rác (style, class, id, data-*) khỏi các thẻ
    .replace(/<(\w+)([^>]*)>/g, (match, tag, attrs) => {
      const t = tag.toLowerCase();
      if (t === 'a') {
        // Giữ href + rel
        const href = attrs.match(/href=["']([^"']*)["']/i);
        const rel  = attrs.match(/rel=["']([^"']*)["']/i);
        let out = href ? ` href="${href[1]}"` : '';
        if (rel) out += ` rel="${rel[1]}"`;
        return `<a${out}>`;
      }
      if (t === 'img') {
        // Giữ src + alt + style (cần thiết để render ảnh)
        const src   = attrs.match(/src=["']([^"']*)["']/i);
        const alt   = attrs.match(/alt=["']([^"']*)["']/i);
        const style = attrs.match(/style=["']([^"']*)["']/i);
        if (!src) return ''; // không có src → bỏ thẻ luôn
        let out = ` src="${src[1]}"`;
        if (alt)   out += ` alt="${alt[1]}"`;
        if (style) out += ` style="${style[1]}"`;
        return `<img${out}>`;
      }
      return `<${tag}>`;
    })
    // Chuẩn hóa khoảng trắng thừa
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Gutenberg publisher ───────────────────────────────────────────────────────
async function publishGutenberg(page, post, siteUrl) {
  // Điền tiêu đề
  const titleSelector = '.editor-post-title__input, [aria-label="Add title"], #post-title-0';
  await page.waitForSelector(titleSelector, { timeout: 10000 });
  await page.click(titleSelector);
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.type(titleSelector, post.title, { delay: 20 });

  // Điền nội dung bằng WP block API (HTML → blocks)
  const htmlContent = cleanHtml(post.content);
  const inserted = await page.evaluate((html) => {
    try {
      if (!window.wp || !window.wp.blocks || !window.wp.data) return false;
      const blocks = window.wp.blocks.rawHandler({ HTML: html });
      if (!blocks || blocks.length === 0) return false;
      window.wp.data.dispatch('core/block-editor').resetBlocks(blocks);
      return true;
    } catch (e) {
      return false;
    }
  }, htmlContent);

  if (!inserted) {
    // Fallback: click vào editor rồi gõ plain text
    await page.keyboard.press('Tab');
    await new Promise((r) => setTimeout(r, 500));
    const contentArea = await page.$('.block-editor-default-block-appender__content, .wp-block-paragraph');
    if (contentArea) await contentArea.click();
    else await page.click('.editor-styles-wrapper, .block-editor-writing-flow');
    await new Promise((r) => setTimeout(r, 300));
    // Dán plain text từ HTML
    const plainText = htmlContent.replace(/<[^>]+>/g, '').trim();
    await page.keyboard.type(plainText, { delay: 5 });
  }

  // Bấm Publish lần 1 (mở panel)
  const publishToggleSelector =
    '.editor-post-publish-panel__toggle, button.editor-post-publish-button:not([aria-disabled="true"])';
  await page.waitForSelector(publishToggleSelector, { timeout: 10000 });
  await page.click(publishToggleSelector);

  // Bấm Publish lần 2 (xác nhận trong panel)
  const confirmSelector = '.editor-post-publish-panel__header-publish-button button, .editor-post-publish-button';
  try {
    await page.waitForSelector(confirmSelector, { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 500));
    await page.click(confirmSelector);
  } catch {
    // Một số WP publish ngay trong lần bấm đầu tiên
  }

  // Chờ "Published" hoặc "View Post" xuất hiện
  await page.waitForSelector(
    '.editor-post-publish-panel__postpublish, .components-notice__content, #wp-admin-bar-view a',
    { timeout: 15000 }
  );

  // Lấy link bài viết
  return await extractPostUrlGutenberg(page, siteUrl);
}

// ── Classic editor publisher ───────────────────────────────────────────────────
async function publishClassic(page, post, siteUrl) {
  // Điền tiêu đề
  await page.waitForSelector('#title', { timeout: 10000 });
  await page.click('#title');
  await page.evaluate(() => { document.querySelector('#title').value = ''; });
  await page.type('#title', post.title, { delay: 20 });

  // Chờ TinyMCE khởi động xong
  const tinyReady = await page.waitForFunction(
    () => typeof window.tinymce !== 'undefined' && window.tinymce.get('content') !== null,
    { timeout: 8000 }
  ).then(() => true).catch(() => false);

  if (tinyReady) {
    // Clean HTML rồi set vào TinyMCE
    const htmlContent = cleanHtml(post.content);
    await page.evaluate((content) => {
      const ed = window.tinymce.get('content');
      ed.setContent(content);
      // Quan trọng: sync TinyMCE → textarea ẩn, WP mới nhận được khi submit
      ed.save();
    }, htmlContent);
    console.log('[classic] TinyMCE content set + saved');
  } else {
    // Fallback: chuyển sang tab Text rồi nhập vào textarea trực tiếp
    console.log('[classic] TinyMCE not ready, switching to Text tab');
    const textTab = await page.$('#content-html');
    if (textTab) {
      await textTab.click();
      await new Promise((r) => setTimeout(r, 400));
    }
    await page.click('#content');
    await page.evaluate((c) => { document.querySelector('#content').value = c; }, post.content);
    // Trigger input event để WP nhận nội dung
    await page.evaluate(() => {
      const ta = document.querySelector('#content');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.dispatchEvent(new Event('change', { bubbles: true }));
    });
    console.log('[classic] Content set via textarea');
  }

  // Đợi 500ms để nội dung được ghi nhận trước khi publish
  await new Promise((r) => setTimeout(r, 500));

  // Bấm Publish
  await page.click('#publish');

  // Chờ trang reload sau publish
  await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 });

  // Lấy link
  return await extractPostUrlClassic(page, siteUrl);
}

// ── Lấy URL bài viết − Gutenberg ─────────────────────────────────────────────
async function extractPostUrlGutenberg(page, siteUrl) {
  // Thử lấy từ panel "View Post"
  try {
    const linkEl = await page.$('.editor-post-publish-panel__postpublish a, .post-publish-panel__postpublish-post-address a');
    if (linkEl) {
      const href = await linkEl.evaluate((el) => el.href);
      if (href && !href.includes('wp-admin')) return href;
    }
  } catch {}

  // Fallback: từ admin bar "View Post"
  try {
    const viewLink = await page.$('#wp-admin-bar-view a');
    if (viewLink) {
      const href = await viewLink.evaluate((el) => el.href);
      if (href) return href;
    }
  } catch {}

  // Fallback: lấy từ URL hiện tại (post ID) → construct permalink
  const currentUrl = page.url();
  const match = currentUrl.match(/post=(\d+)/);
  if (match) return `${siteUrl}/?p=${match[1]}`;

  return `${siteUrl}/wp-admin/ (link không lấy được)`;
}

// ── Lấy URL bài viết − Classic ───────────────────────────────────────────────
async function extractPostUrlClassic(page, siteUrl) {
  try {
    // Permalink hiển thị sau khi publish
    const permEl = await page.$('#sample-permalink a, #view-post-btn a');
    if (permEl) {
      const href = await permEl.evaluate((el) => el.href);
      if (href) return href;
    }
  } catch {}

  // Fallback từ notice
  try {
    const noticeLink = await page.$('.notice.updated a, #message a');
    if (noticeLink) return await noticeLink.evaluate((el) => el.href);
  } catch {}

  const currentUrl = page.url();
  const match = currentUrl.match(/post=(\d+)/);
  if (match) return `${siteUrl}/?p=${match[1]}`;

  return `${siteUrl}/wp-admin/ (link không lấy được)`;
}

// ── Chuyển tiêu đề tiếng Việt → slug URL (giống WP sanitize_title) ──────────
function titleToSlug(title) {
  const map = {
    à:'a',á:'a',ả:'a',ã:'a',ạ:'a',
    ă:'a',ằ:'a',ắ:'a',ẳ:'a',ẵ:'a',ặ:'a',
    â:'a',ầ:'a',ấ:'a',ẩ:'a',ẫ:'a',ậ:'a',
    è:'e',é:'e',ẻ:'e',ẽ:'e',ẹ:'e',
    ê:'e',ề:'e',ế:'e',ể:'e',ễ:'e',ệ:'e',
    ì:'i',í:'i',ỉ:'i',ĩ:'i',ị:'i',
    ò:'o',ó:'o',ỏ:'o',õ:'o',ọ:'o',
    ô:'o',ồ:'o',ố:'o',ổ:'o',ỗ:'o',ộ:'o',
    ơ:'o',ờ:'o',ớ:'o',ở:'o',ỡ:'o',ợ:'o',
    ù:'u',ú:'u',ủ:'u',ũ:'u',ụ:'u',
    ư:'u',ừ:'u',ứ:'u',ử:'u',ữ:'u',ự:'u',
    ỳ:'y',ý:'y',ỷ:'y',ỹ:'y',ỵ:'y',
    đ:'d',
    // uppercase
    À:'a',Á:'a',Ả:'a',Ã:'a',Ạ:'a',
    Ă:'a',Ằ:'a',Ắ:'a',Ẳ:'a',Ẵ:'a',Ặ:'a',
    Â:'a',Ầ:'a',Ấ:'a',Ẩ:'a',Ẫ:'a',Ậ:'a',
    È:'e',É:'e',Ẻ:'e',Ẽ:'e',Ẹ:'e',
    Ê:'e',Ề:'e',Ế:'e',Ể:'e',Ễ:'e',Ệ:'e',
    Ì:'i',Í:'i',Ỉ:'i',Ĩ:'i',Ị:'i',
    Ò:'o',Ó:'o',Ỏ:'o',Õ:'o',Ọ:'o',
    Ô:'o',Ồ:'o',Ố:'o',Ổ:'o',Ỗ:'o',Ộ:'o',
    Ơ:'o',Ờ:'o',Ớ:'o',Ở:'o',Ỡ:'o',Ợ:'o',
    Ù:'u',Ú:'u',Ủ:'u',Ũ:'u',Ụ:'u',
    Ư:'u',Ừ:'u',Ứ:'u',Ử:'u',Ữ:'u',Ự:'u',
    Ỳ:'y',Ý:'y',Ỷ:'y',Ỹ:'y',Ỵ:'y',
    Đ:'d',
  };
  return (title || '')
    .split('').map(c => map[c] ?? c).join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// -- Chuan hoa & rut gon slug URL, them suffix ngan de dam bao khong trung --
function sanitizeSlug(raw, maxLen = 45) {
  const base = (raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  // Suffix 4 ky tu ngau nhien (a-z0-9) de dam bao permalink khong trung nhau
  const suffix = Math.random().toString(36).slice(2, 6);
  // Giu base ngan hon de cong them '-xxxx'
  const trimmed = base.slice(0, maxLen - 5).replace(/-+$/, '');
  return trimmed ? `${trimmed}-${suffix}` : suffix;
}

// ── Lấy post ID từ URL admin hiện tại ─────────────────────────────────────────
async function getPostIdFromPage(page) {
  try {
    const url = page.url();
    const m = url.match(/[?&]post=(\d+)/);
    if (m) return m[1];
  } catch {}
  return null;
}

// ── Gán Focus Keyword + meta qua WP REST API (dùng cookie session trong browser) ──
// Hỗ trợ: Rank Math, Yoast SEO + cập nhật slug URL
async function setFocusKeywordMeta(page, siteUrl, postId, post) {
  if (!postId || !post.keyword) return;
  // Rút gọn slug trước khi gửi để đảm bảo permalink ngắn
  const safeSlug = sanitizeSlug(post.slug || post.keyword || '');
  try {
    const result = await page.evaluate(
      async (apiUrl, keyword, metaDesc, slug) => {
        // WordPress inject wpApiSettings.nonce trên mọi trang admin
        const nonce =
          window.wpApiSettings?.nonce ||
          window.wp?.apiFetch?.nonceMiddleware?.nonce ||
          '';
        if (!nonce) return { error: 'WP nonce not found' };

        const body = {
          meta: {
            // ── Rank Math ──
            rank_math_focus_keyword: keyword,
            rank_math_description:   metaDesc || '',
            // ── Yoast SEO (fallback) ──
            _yoast_wpseo_focuskw:    keyword,
            _yoast_wpseo_metadesc:   metaDesc || '',
          },
        };

        // Cập nhật slug URL nếu có (slug đã được sanitize trước khi truyền vào)
        if (slug) body.slug = slug;

        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': nonce,
          },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, status: res.status, slug: data.slug || '' };
      },
      `${siteUrl}/wp-json/wp/v2/posts/${postId}`,
      post.keyword,
      post.meta_description || '',
      safeSlug
    );

    if (result?.ok) {
      console.log(
        `[seoMeta] Post ${postId}: keyword="${post.keyword}"` +
        (result.slug ? ` → slug="${result.slug}"` : '') + ' ✓'
      );
      return result.slug || null;
    } else {
      console.warn(
        `[seoMeta] Post ${postId} meta update: HTTP ${result?.status}`,
        result?.error || ''
      );
    }
  } catch (err) {
    console.warn(`[seoMeta] setFocusKeywordMeta error: ${err.message}`);
  }
  return null;
}

// ── Điền Focus Keyword vào input của Rank Math/Yoast qua UI (Puppeteer) ──────
async function fillRankMathKeyword(page, keyword, isGutenberg = false) {
  if (!keyword) return false;

  // ── Classic editor: metabox hiển thị sẵn ────────────────────────────────
  const classicSelectors = [
    'input[name="rank_math_focus_keyword"]',
    '#rank-math-field-focus_keyword',
    'input[placeholder*="Rank Math"]',
    'input[placeholder*="rank math"]',
    '.rank-math-focus-keyword input',
    'input[id*="focus_keyword"]',
    'input[id*="focus-keyword"]',
    '#focus-keyword-input',
    'input[id*="yoast"][id*="focus"]',
  ];

  async function tryFillInput(sel) {
    const el = await page.$(sel);
    if (!el) return false;
    const visible = await page.evaluate(
      (e) => !!(e && (e.offsetWidth || e.offsetHeight || e.getClientRects().length)),
      el
    ).catch(() => true);
    if (!visible) return false;
    await el.click({ clickCount: 3 });
    await new Promise((r) => setTimeout(r, 80));
    await el.type(keyword, { delay: 35 });
    return true;
  }

  if (!isGutenberg) {
    // Classic: thử từng selector
    for (const sel of classicSelectors) {
      try {
        if (await tryFillInput(sel)) {
          // Rank Math Classic cũng dùng token field — cần Enter để confirm keyword
          await page.keyboard.press('Enter');
          await new Promise((r) => setTimeout(r, 300));
          console.log(`[rankmath] Classic UI "${sel}": "${keyword}" ✓`);
          return true;
        }
      } catch { /* thử tiếp */ }
    }
    console.log('[rankmath] Classic UI: không tìm thấy input (REST API đã xử lý)');
    return false;
  }

  // ── Gutenberg: panel Rank Math nằm trong sidebar, cần mở và điền rồi Update ─
  try {
    // Bước 1: Đóng overlay "Published" nếu đang hiện
    await page.keyboard.press('Escape').catch(() => {});
    await new Promise((r) => setTimeout(r, 600));

    // Bước 2: Mở panel Rank Math trong sidebar nếu chưa mở
    // Rank Math inject một icon/button vào thanh toolbar của Gutenberg
    const rmIconSelectors = [
      'button[aria-label="Rank Math SEO"]',
      'button[aria-label*="Rank Math"]',
      '.rank-math-toolbar button',
      '.rank-math-icon',
      'button[data-cy="rank-math-button"]',
    ];
    for (const sel of rmIconSelectors) {
      try {
        const btn = await page.$(sel);
        if (!btn) continue;
        // Kiểm tra panel đã mở chưa trước khi click (click lúc đã mở sẽ đóng lại)
        const panelAlreadyOpen = await page.$(
          '.rank-math-wrap, #rank-math-app, .rank-math-sidebar, [class*="rank-math"] input'
        ).catch(() => null);
        if (!panelAlreadyOpen) {
          await btn.click();
          await new Promise((r) => setTimeout(r, 900));
        }
        break;
      } catch { /* thử selector tiếp */ }
    }

    // Bước 3: Tìm input focus keyword trong panel Gutenberg
    // Rank Math Gutenberg dùng components-form-token-field (nhập rồi Enter để tạo token)
    const gutenbergSelectors = [
      'input[placeholder="Add Focus Keyword"]',
      'input[placeholder="Focus Keyword"]',
      'input[placeholder*="focus keyword" i]',
      'input[placeholder*="Focus keyword" i]',
      '.rank-math-focus-keyword input',
      '[data-cy="focus-keyword"] input',
      '[data-cy="focus-keyword"]',
      '.rank-math-wrap .components-form-token-field__input',
      '#rank-math-app .components-form-token-field__input',
      '.rank-math-sidebar .components-base-control input',
      ...classicSelectors,   // cũng thử classic selectors phòng khi theme dùng mixed
    ];

    for (const sel of gutenbergSelectors) {
      try {
        const el = await page.$(sel);
        if (!el) continue;
        const visible = await page.evaluate(
          (e) => !!(e && (e.offsetWidth || e.offsetHeight || e.getClientRects().length)),
          el
        ).catch(() => true);
        if (!visible) continue;

        await el.click({ clickCount: 3 });
        await new Promise((r) => setTimeout(r, 100));
        await el.type(keyword, { delay: 35 });
        // Rank Math token field cần nhấn Enter để xác nhận keyword
        await page.keyboard.press('Enter');
        await new Promise((r) => setTimeout(r, 500));

        // Bước 4: Làm bài viết "dirty" để nút Update sáng lên
        // Sau khi publish, Gutenberg coi post là "clean" → nút Update bị disable.
        // Cách fix: thêm 1 dấu cách vào cuối block đầu tiên qua wp.data API,
        // hoặc fallback: click vào editor rồi gõ space → xóa space (giữ nội dung nguyên vẹn).
        const madeEditorDirty = await page.evaluate(() => {
          try {
            if (!window.wp?.data) return false;
            const select = window.wp.data.select('core/block-editor');
            const dispatch = window.wp.data.dispatch('core/block-editor');
            const blocks = select.getBlocks();
            if (!blocks || blocks.length === 0) return false;
            // Tìm block paragraph đầu tiên để thêm dấu cách vào cuối
            for (const block of blocks) {
              if (block.name === 'core/paragraph' && typeof block.attributes.content === 'string') {
                dispatch.updateBlockAttributes(block.clientId, {
                  content: block.attributes.content + ' ',
                });
                return true;
              }
            }
            return false;
          } catch { return false; }
        });

        if (!madeEditorDirty) {
          // Fallback: click vào editor content area, gõ space rồi xóa ngay
          try {
            const contentArea = await page.$('.block-editor-writing-flow, .editor-styles-wrapper');
            if (contentArea) {
              await contentArea.click();
              await new Promise((r) => setTimeout(r, 200));
              await page.keyboard.press('End');
              await page.keyboard.type(' ');
              await new Promise((r) => setTimeout(r, 100));
              await page.keyboard.press('Backspace');
              await new Promise((r) => setTimeout(r, 100));
            }
          } catch { /* bỏ qua */ }
        }
        await new Promise((r) => setTimeout(r, 400));

        // Bước 5: Nhấn Update để lưu lại (post đã publish nên nút là "Update")
        const updateSelectors = [
          'button.editor-post-publish-button:not([aria-disabled="true"])',
          'button[aria-label="Update"]',
          '.editor-post-publish-button__button:not([disabled])',
          '.editor-post-save-draft',
        ];
        for (const upd of updateSelectors) {
          try {
            const btn = await page.$(upd);
            if (!btn) continue;
            await btn.click();
            await new Promise((r) => setTimeout(r, 2000));
            break;
          } catch { /* thử nút tiếp */ }
        }

        console.log(`[rankmath] Gutenberg UI "${sel}": "${keyword}" ✓`);
        return true;
      } catch { /* thử selector tiếp */ }
    }
  } catch (err) {
    console.warn(`[rankmath] Gutenberg fillRankMath error: ${err.message}`);
  }

  console.log('[rankmath] Gutenberg UI: không tìm thấy input focus keyword (REST API đã ghi DB)');
  return false;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Export wrapper: đưa job vào browserQueue để đảm bảo chỉ 1 browser tại 1 lúc.
 * Tránh xung đột khi nhiều pipeline jobs hoặc pipeline + old jobs chạy đồng thời.
 */
export async function runPbnJob(jobId, siteUrl, username, password, posts, emit) {
  // Queue message
  const queueSize = browserQueue.size + browserQueue.pending;
  if (queueSize > 0) {
    emit('status', { message: `⏳ Chờ browser queue (${queueSize} job trước)...`, jobId });
  }

  return browserQueue.add(() =>
    _runPbnJobInternal(jobId, siteUrl, username, password, posts, emit)
  );
}
