import { useState } from 'react';
import SiteSetup from './components/SiteSetup';
import PostsForm from './components/PostsForm';
import LogPanel from './components/LogPanel';
import GeneratePanel from './components/GeneratePanel';
import ArticlePreview from './components/ArticlePreview';
import WorkflowPanel from './components/WorkflowPanel';
import { useJobStream } from './hooks/useJobStream';

export default function App() {
  // Tab: 'post' | 'generate' | 'workflow'
  const [activeTab, setActiveTab] = useState('workflow');

  // Step 1: site URL + credentials + post count
  const [siteUrl, setSiteUrl] = useState('');
  const [accountIdx, setAccountIdx] = useState(null);
  const [postCount, setPostCount] = useState('');

  // Step 2: dynamic post forms
  const [posts, setPosts] = useState([]); // [{ title, content }]
  const [formReady, setFormReady] = useState(false);

  // Refresh key để trigger ArticlePreview re-fetch
  const [refreshKey, setRefreshKey] = useState(0);

  // Job state
  const [jobId, setJobId] = useState(null);
  const [submitError, setSubmitError] = useState('');

  const { events, summary, running } = useJobStream(jobId);

  // Generate N empty post forms
  const handleGenerateForms = () => {
    const n = parseInt(postCount, 10);
    if (!siteUrl.trim() || !/^https?:\/\//.test(siteUrl)) {
      setSubmitError('Vui lòng chọn hoặc nhập URL hợp lệ');
      return;
    }
    if (accountIdx === null || accountIdx === undefined) {
      setSubmitError('Vui lòng chọn tài khoản đăng nhập');
      return;
    }
    if (!n || n < 1 || n > 100) {
      setSubmitError('Số bài phải từ 1 đến 100');
      return;
    }
    setSubmitError('');
    setPosts(Array.from({ length: n }, () => ({ title: '', content: '' })));
    setFormReady(true);
    setJobId(null);
  };

  const handleStartJob = async () => {
    setSubmitError('');
    const empty = posts.findIndex((p) => !p.title.trim() || !p.content.trim());
    if (empty !== -1) {
      setSubmitError(`Bài viết ${empty + 1}: tiêu đề và nội dung không được để trống`);
      return;
    }

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteUrl, accountIdx, posts }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || JSON.stringify(data.details));
      setJobId(data.jobId);
    } catch (err) {
      setSubmitError(err.message);
    }
  };

  // When user clicks "→ Dùng" from ArticlePreview, add article to posts queue
  const handleUseArticle = ({ title, content }) => {
    setPosts((prev) => [...prev, { title, content }]);
    setFormReady(true);
    setActiveTab('post');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <span className="text-2xl">🔗</span>
        <h1 className="text-xl font-bold tracking-tight">Auto PBN Poster</h1>
        <span className="ml-auto text-xs text-gray-500">v2.0 · Puppeteer mode</span>
      </header>

      {/* Tab nav */}
      <div className="bg-gray-900 border-b border-gray-800 px-6">
        <nav className="flex gap-1">
          {[
            // { key: 'post',      label: '📤 Đăng bài' },
            // { key: 'generate',  label: '✨ Generate bài' },
            { key: 'workflow',  label: '🚀 Chiến dịch' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">        {/* ── TAB: CHIẾN DỊCH ───────────────────────────── */}
        {activeTab === 'workflow' && (
          <WorkflowPanel />
        )}
        
        {/* ── TAB: ĐăNG BÀI (Tắt) ─────────────────────────────────────── 
        {activeTab === 'post' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-5">
              <SiteSetup
                siteUrl={siteUrl}
                setSiteUrl={setSiteUrl}
                accountIdx={accountIdx}
                setAccountIdx={setAccountIdx}
                postCount={postCount}
                setPostCount={setPostCount}
                onGenerate={handleGenerateForms}
                locked={running}
              />

              {formReady && (
                <PostsForm posts={posts} setPosts={setPosts} locked={running} />
              )}

              {submitError && (
                <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded px-3 py-2">
                  ⚠ {submitError}
                </p>
              )}

              {formReady && (
                <button
                  onClick={handleStartJob}
                  disabled={running}
                  className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm transition-colors"
                >
                  {running
                    ? '⏳ Đang đăng bài — xem trình duyệt vừa mở...'
                    : `▶ Bắt đầu đăng ${posts.length} bài lên ${siteUrl}`}
                </button>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <LogPanel events={events} summary={summary} total={posts.length} />
              {summary && (
                <button
                  onClick={() => window.open('/api/posts.txt', '_blank')}
                  className="w-full py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm transition-colors"
                >
                  ⬇ Tải xuống posts.txt
                </button>
              )}
            </div>
          </div>
        )} */}

        {/* ── TAB: GENERATE BÀI (Tắt) ──────────────────────────────────── 
        {activeTab === 'generate' && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.2fr]">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <h2 className="text-base font-semibold mb-4">Generate bài viết AI</h2>
              <GeneratePanel onArticlesReady={() => setRefreshKey((k) => k + 1)} />
            </div>

            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <h2 className="text-base font-semibold mb-4">Bài viết đã tạo</h2>
              <ArticlePreview onUseArticle={handleUseArticle} refreshKey={refreshKey} />
            </div>
          </div>
        )} */}
      </main>
    </div>
  );
}
