import { useState } from 'react';
import SiteSetup from './components/SiteSetup';
import PostsForm from './components/PostsForm';
import LogPanel from './components/LogPanel';
import { useJobStream } from './hooks/useJobStream';

export default function App() {
  // Step 1: site URL + post count
  const [siteUrl, setSiteUrl] = useState('');
  const [postCount, setPostCount] = useState('');

  // Step 2: dynamic post forms
  const [posts, setPosts] = useState([]); // [{ title, content }]
  const [formReady, setFormReady] = useState(false);

  // Job state
  const [jobId, setJobId] = useState(null);
  const [submitError, setSubmitError] = useState('');

  const { events, summary, running } = useJobStream(jobId);

  // Generate N empty post forms
  const handleGenerateForms = () => {
    const n = parseInt(postCount, 10);
    if (!siteUrl.trim() || !/^https?:\/\//.test(siteUrl)) {
      setSubmitError('Vui lòng nhập URL hợp lệ (bắt đầu bằng https://)');
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
        body: JSON.stringify({ siteUrl, posts }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || JSON.stringify(data.details));
      setJobId(data.jobId);
    } catch (err) {
      setSubmitError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <span className="text-2xl">🔗</span>
        <h1 className="text-xl font-bold tracking-tight">Auto PBN Poster</h1>
        <span className="ml-auto text-xs text-gray-500">v2.0 · Puppeteer mode</span>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="flex flex-col gap-5">
          {/* Step 1 */}
          <SiteSetup
            siteUrl={siteUrl}
            setSiteUrl={setSiteUrl}
            postCount={postCount}
            setPostCount={setPostCount}
            onGenerate={handleGenerateForms}
            locked={running}
          />

          {/* Step 2 — dynamic forms */}
          {formReady && (
            <PostsForm posts={posts} setPosts={setPosts} locked={running} />
          )}

          {/* Error */}
          {submitError && (
            <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded px-3 py-2">
              ⚠ {submitError}
            </p>
          )}

          {/* Start button */}
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

        {/* Right column — live log */}
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
      </main>
    </div>
  );
}
