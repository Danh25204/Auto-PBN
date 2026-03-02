import { useState } from 'react';
import SitesPanel from './components/SitesPanel';
import ContentPanel from './components/ContentPanel';
import LogPanel from './components/LogPanel';
import { useJobStream } from './hooks/useJobStream';

export default function App() {
  const [sites, setSites] = useState([]);
  const [post, setPost] = useState({ title: '', content: '', status: 'publish' });
  const [jobId, setJobId] = useState(null);
  const [submitError, setSubmitError] = useState('');

  const { events, summary, running } = useJobStream(jobId);

  const handleSubmit = async () => {
    setSubmitError('');
    if (sites.length === 0) return setSubmitError('Add at least one site.');
    if (!post.title.trim()) return setSubmitError('Post title is required.');
    if (!post.content.trim()) return setSubmitError('Post content is required.');

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sites, post }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      setJobId(data.jobId);
    } catch (err) {
      setSubmitError(err.message);
    }
  };

  const handleDownload = () => {
    window.open('/api/posts.txt', '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <span className="text-2xl">🔗</span>
        <h1 className="text-xl font-bold tracking-tight">Auto PBN Poster</h1>
        <span className="ml-auto text-xs text-gray-500">v1.0 · Local tool</span>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="flex flex-col gap-6">
          <SitesPanel sites={sites} setSites={setSites} />
          <ContentPanel post={post} setPost={setPost} />

          {submitError && (
            <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded px-3 py-2">
              {submitError}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={running}
            className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm transition-colors"
          >
            {running ? '⏳ Posting…' : '▶ Post to All Sites'}
          </button>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <LogPanel events={events} summary={summary} total={sites.length} />
          {summary && (
            <button
              onClick={handleDownload}
              className="w-full py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm transition-colors"
            >
              ⬇ Download posts.txt
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
