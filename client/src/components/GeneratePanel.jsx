import { useState, useRef } from 'react';

export default function GeneratePanel({ onArticlesReady }) {
  const [topicsText, setTopicsText] = useState('');
  const [mode, setMode] = useState('sync'); // 'sync' | 'batch'
  const [model, setModel] = useState('gpt-4o-mini');
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState([]);
  const [batchId, setBatchId] = useState('');
  const [batchStatus, setBatchStatus] = useState(null);
  const [pollingId, setPollingId] = useState(null);
  const esRef = useRef(null);

  const topics = topicsText
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean);

  function addEvent(type, text) {
    setEvents((prev) => [...prev, { type, text, id: Date.now() + Math.random() }]);
  }

  // ── Sync mode ──
  function startSync() {
    if (!topics.length) return;
    setRunning(true);
    setEvents([]);

    const es = new EventSource(
      `/api/generate/sync-stream?topics=${encodeURIComponent(JSON.stringify(topics))}&model=${model}`
    );
    esRef.current = es;

    // Gọi POST rồi nhận SSE — dùng fetch + ReadableStream
    es.close(); // EventSource không hỗ trợ POST → dùng fetch bên dưới

    const articles = [];
    (async () => {
      try {
        const resp = await fetch('/api/generate/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topics, model }),
        });

        if (!resp.ok) {
          const ct = resp.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const err = await resp.json();
            throw new Error(err.error || `HTTP ${resp.status}`);
          }
          throw new Error(`Server trả lỗi HTTP ${resp.status}`);
        }
        if (!resp.body) throw new Error('Không có response body');

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          // Parse SSE events
          const chunks = buf.split('\n\n');
          buf = chunks.pop() || '';
          for (const chunk of chunks) {
            const lines = chunk.split('\n');
            let evtName = '';
            let dataStr = '';
            for (const line of lines) {
              if (line.startsWith('event: ')) evtName = line.slice(7);
              if (line.startsWith('data: ')) dataStr = line.slice(6);
            }
            if (!dataStr) continue;
            try {
              const payload = JSON.parse(dataStr);
              if (evtName === 'start') {
                addEvent('info', `Bắt đầu generate ${payload.total} bài...`);
              } else if (evtName === 'article') {
                const a = payload.article;
                articles.push(a);
                if (a.status === 'ready') {
                  addEvent('ok', `✓ [${payload.idx + 1}/${payload.total}] ${a.title} (${a.wordCount} từ)`);
                } else {
                  addEvent('err', `✗ [${payload.idx + 1}/${payload.total}] ${a.topic}: ${a.error || 'failed'}`);
                }
              } else if (evtName === 'done') {
                addEvent('info', `Hoàn tất: ${payload.saved}/${payload.total} bài đã lưu.`);
              } else if (evtName === 'error') {
                addEvent('err', `Lỗi: ${payload.message}`);
              }
            } catch {}
          }
        }

        onArticlesReady?.();
      } catch (err) {
        addEvent('err', `Lỗi kết nối: ${err.message}`);
      } finally {
        setRunning(false);
      }
    })();
  }

  // ── Batch mode ──
  async function startBatch() {
    if (!topics.length) return;
    setRunning(true);
    setEvents([]);
    setBatchStatus(null);

    try {
      const res = await fetch('/api/generate/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topics, model }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Tạo batch thất bại');

      setBatchId(data.batchId);
      addEvent('info', `Batch created: ${data.batchId} (${data.topicCount} topics)`);
      addEvent('info', 'Đang poll status mỗi 30 giây...');

      // Start polling every 30s
      const pid = setInterval(() => pollBatch(data.batchId), 30000);
      setPollingId(pid);
      pollBatch(data.batchId); // immediate first poll
    } catch (err) {
      addEvent('err', `Lỗi: ${err.message}`);
      setRunning(false);
    }
  }

  async function pollBatch(id) {
    try {
      const res = await fetch(`/api/generate/batch/${id}`);
      const data = await res.json();
      setBatchStatus(data);
      addEvent('info', `Batch status: ${data.status} — ${JSON.stringify(data.requestCounts)}`);

      if (data.status === 'completed' || data.status === 'failed' || data.status === 'expired') {
        clearInterval(pollingId);
        setPollingId(null);
        setRunning(false);

        if (data.status === 'completed') {
          addEvent('ok', `Batch hoàn tất! ${data.articles?.length || 0} bài đã lưu.`);
          onArticlesReady?.();
        } else {
          addEvent('err', `Batch ${data.status}`);
        }
      }
    } catch (err) {
      addEvent('err', `Poll lỗi: ${err.message}`);
    }
  }

  function stopPolling() {
    if (pollingId) { clearInterval(pollingId); setPollingId(null); }
    setRunning(false);
  }

  function handleStart() {
    if (mode === 'sync') startSync();
    else startBatch();
  }

  return (
    <div className="space-y-4">
      {/* Topics input */}
      <div>
        <label className="label">Danh sách topic (mỗi dòng 1 topic)</label>
        <textarea
          className="input-field w-full h-48 resize-y font-mono text-sm"
          placeholder={"Cách trồng cây tại nhà\nThiết kế nội thất phòng khách\nNuôi chó Corgi"}
          value={topicsText}
          onChange={(e) => setTopicsText(e.target.value)}
          disabled={running}
        />
        <p className="text-xs text-gray-400 mt-1">{topics.length} topic(s)</p>
      </div>

      {/* Options row */}
      <div className="flex flex-wrap gap-4 items-end">
        {/* Mode toggle */}
        <div>
          <label className="label">Chế độ generate</label>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('sync')}
              className={`px-3 py-1.5 rounded text-sm font-medium border transition-colors ${
                mode === 'sync' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              disabled={running}
            >
              Sync (nhanh)
            </button>
            <button
              onClick={() => setMode('batch')}
              className={`px-3 py-1.5 rounded text-sm font-medium border transition-colors ${
                mode === 'batch' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              disabled={running}
            >
              Batch API (rẻ hơn 50%)
            </button>
          </div>
          {mode === 'batch' && (
            <p className="text-xs text-amber-600 mt-1">Batch thường mất 15–60 phút, app sẽ tự poll.</p>
          )}
        </div>

        {/* Model select */}
        <div>
          <label className="label">Model</label>
          <select
            className="input-field"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={running}
          >
            <option value="gpt-4o-mini">gpt-4o-mini (rẻ, nhanh)</option>
            <option value="gpt-4o">gpt-4o (chất lượng cao)</option>
          </select>
        </div>

        {/* Action */}
        <div className="flex gap-2">
          <button
            onClick={handleStart}
            disabled={running || topics.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
          >
            {running ? 'Đang generate...' : `Generate ${topics.length} bài`}
          </button>
          {running && mode === 'batch' && (
            <button
              onClick={stopPolling}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
            >
              Dừng poll
            </button>
          )}
        </div>
      </div>

      {/* Batch poll manually */}
      {mode === 'batch' && !running && (
        <div className="flex gap-2 items-center">
          <input
            className="input-field flex-1 text-sm font-mono"
            placeholder="batch_xxx... (để poll lại sau)"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
          />
          <button
            onClick={() => batchId && pollBatch(batchId)}
            className="px-3 py-1.5 btn-secondary text-sm"
          >
            Poll
          </button>
        </div>
      )}

      {/* Log */}
      {events.length > 0 && (
        <div className="bg-gray-900 rounded p-3 text-xs font-mono space-y-1 max-h-64 overflow-y-auto">
          {events.map((e) => (
            <div
              key={e.id}
              className={
                e.type === 'ok' ? 'text-green-400' : e.type === 'err' ? 'text-red-400' : 'text-gray-300'
              }
            >
              {e.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
