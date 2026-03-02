export default function LogPanel({ events, summary, total }) {
  const done = events.length;
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
            <span>{done} / {total} processed</span>
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

      {/* Summary badge */}
      {summary && (
        <div className="flex gap-3 text-xs">
          <span className="bg-green-900 text-green-300 border border-green-700 rounded px-2 py-1">
            ✓ {summary.completed} success
          </span>
          {summary.failed > 0 && (
            <span className="bg-red-900 text-red-300 border border-red-700 rounded px-2 py-1">
              ✗ {summary.failed} failed
            </span>
          )}
        </div>
      )}

      {/* Event list */}
      <div className="flex-1 overflow-y-auto max-h-96 space-y-1 text-xs font-mono">
        {events.length === 0 ? (
          <p className="text-gray-600 italic">Waiting for job to start…</p>
        ) : (
          events.map((ev, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 px-2 py-1 rounded ${
                ev.status === 'ok'
                  ? 'bg-green-950 text-green-300'
                  : 'bg-red-950 text-red-300'
              }`}
            >
              <span>{ev.status === 'ok' ? '✓' : '✗'}</span>
              <span className="truncate flex-1">{ev.siteUrl}</span>
              {ev.status === 'ok' ? (
                <a
                  href={ev.postUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline opacity-70 hover:opacity-100 truncate max-w-[40%]"
                >
                  {ev.postUrl}
                </a>
              ) : (
                <span className="opacity-70 truncate max-w-[40%]">{ev.error}</span>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
