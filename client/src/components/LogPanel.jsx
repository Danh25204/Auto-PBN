export default function LogPanel({ events, summary, total }) {
  const progressEvents = events.filter((e) => e.type === 'progress');
  const done = progressEvents.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
        ③ Live Log
      </h2>

      {/* Progress bar */}
      {total > 0 && (
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{done} / {total} bài</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="flex gap-3 text-xs">
          <span className="bg-green-900 text-green-300 border border-green-700 rounded px-2 py-1">
            ✓ {summary.completed} thành công
          </span>
          {summary.failed > 0 && (
            <span className="bg-red-900 text-red-300 border border-red-700 rounded px-2 py-1">
              ✗ {summary.failed} thất bại
            </span>
          )}
        </div>
      )}

      {/* Event list */}
      <div className="flex-1 overflow-y-auto max-h-[50vh] space-y-1 text-xs font-mono">
        {events.length === 0 ? (
          <p className="text-gray-600 italic">Chờ job bắt đầu...</p>
        ) : (
          events.map((ev, i) => {
            if (ev.type === 'status') {
              return (
                <div key={i} className="bg-blue-950 text-blue-300 border border-blue-800 rounded px-3 py-2">
                  {ev.data.message}
                </div>
              );
            }
            if (ev.type === 'progress') {
              const { index, total: t, status, title, postUrl, error } = ev.data;
              if (status === 'posting') {
                return (
                  <div key={i} className="text-gray-400 px-2 py-1">
                    ⏳ [{index}/{t}] Đang đăng: {title}
                  </div>
                );
              }
              return (
                <div
                  key={i}
                  className={`flex items-start gap-2 px-2 py-1 rounded ${
                    status === 'ok'
                      ? 'bg-green-950 text-green-300'
                      : 'bg-red-950 text-red-300'
                  }`}
                >
                  <span>{status === 'ok' ? '✓' : '✗'}</span>
                  <span className="flex-1 truncate">[{index}/{t}] {title}</span>
                  {status === 'ok' ? (
                    <a
                      href={postUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline opacity-70 hover:opacity-100 truncate max-w-[40%]"
                    >
                      {postUrl}
                    </a>
                  ) : (
                    <span className="opacity-70 truncate max-w-[50%]">{error}</span>
                  )}
                </div>
              );
            }
            return null;
          })
        )}
      </div>
    </section>
  );
}
