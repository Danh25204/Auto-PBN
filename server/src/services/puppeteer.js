import puppeteer from 'puppeteer';
import { appendPostLog } from './logger.js';

const LOGIN_TIMEOUT_MS = 5 * 60 * 1000; // 5 phút để đăng nhập tay
const ACTION_TIMEOUT_MS = 20000;

/**
 * Chạy toàn bộ job: mở browser → user login thủ công → đăng từng bài.
 *
 * @param {string}   jobId
 * @param {string}   siteUrl  - e.g. https://88vns.net
 * @param {Array}    posts    - [{ title, content }]
 * @param {Function} emit     - emit(event, data) → SSE
 */
export async function runPbnJob(jobId, siteUrl, posts, emit) {
  const browser = await puppeteer.launch({
    headless: false,           // user cần thấy browser để login
    defaultViewport: null,
    args: ['--start-maximized', '--disable-infobars'],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  console.log(`[puppeteer:${jobId}] Browser opened for ${siteUrl}`);

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(ACTION_TIMEOUT_MS);

    // ── Bước 1: Mở trang login ───────────────────────────────────────────────
    await page.goto(`${siteUrl}/wp-login.php`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    emit('status', {
      message: `🔐 Vui lòng đăng nhập vào WP Admin trong cửa sổ trình duyệt vừa mở...`,
    });

    // ── Bước 2: Chờ user đăng nhập (tối đa 5 phút) ──────────────────────────
    await waitForLogin(page, siteUrl);
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
        await page.goto(`${siteUrl}/wp-admin/post-new.php`, {
          waitUntil: 'domcontentloaded',
          timeout: 20000,
        });

        // Phát hiện Gutenberg hay Classic editor
        const isGutenberg = await detectGutenberg(page);
        console.log(`[puppeteer:${jobId}] Post ${postNum}: editor=${isGutenberg ? 'Gutenberg' : 'Classic'}`);

        let postUrl;
        if (isGutenberg) {
          postUrl = await publishGutenberg(page, post, siteUrl);
        } else {
          postUrl = await publishClassic(page, post, siteUrl);
        }

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
    setTimeout(() => browser.close(), 3000);
  }
}

// ── Chờ login ─────────────────────────────────────────────────────────────────
async function waitForLogin(page, siteUrl) {
  const deadline = Date.now() + LOGIN_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const url = page.url();
    if (
      url.includes('/wp-admin') &&
      !url.includes('wp-login.php') &&
      !url.includes('action=logout')
    ) {
      // Chờ thêm 1s để trang load xong
      await new Promise((r) => setTimeout(r, 1000));
      return;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('Login timeout — vượt quá 5 phút chờ đăng nhập');
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

  // Điền nội dung — click vào vùng content sau title
  await page.keyboard.press('Tab');
  await new Promise((r) => setTimeout(r, 500));

  // Xóa placeholder block rồi gõ
  const contentArea = await page.$('.block-editor-default-block-appender__content, .wp-block-paragraph');
  if (contentArea) await contentArea.click();
  else {
    // Click vào editor body
    await page.click('.editor-styles-wrapper, .block-editor-writing-flow');
  }
  await new Promise((r) => setTimeout(r, 300));
  await page.keyboard.type(post.content, { delay: 10 });

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

  // Điền nội dung — thử TinyMCE trước, fallback sang textarea
  try {
    await page.waitForSelector('#wp-content-editor-container', { timeout: 3000 });
    const isTinyMCEActive = await page.evaluate(() => {
      return typeof tinymce !== 'undefined' && tinymce.get('content') !== null;
    });

    if (isTinyMCEActive) {
      await page.evaluate((content) => {
        tinymce.get('content').setContent(content);
      }, post.content);
    } else {
      // Text mode
      await page.click('#content');
      await page.evaluate(() => { document.querySelector('#content').value = ''; });
      await page.type('#content', post.content, { delay: 5 });
    }
  } catch {
    // Fallback
    await page.click('#content');
    await page.evaluate((c) => { document.querySelector('#content').value = c; }, post.content);
  }

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
