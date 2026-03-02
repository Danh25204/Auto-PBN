export default function ContentPanel({ post, setPost }) {
  return (
    <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
        ② Post Content
      </h2>

      <div className="flex flex-col gap-3">
        <div>
          <label className="label">Title</label>
          <input
            type="text"
            placeholder="Enter post title…"
            value={post.title}
            onChange={(e) => setPost((p) => ({ ...p, title: e.target.value }))}
            className="input-field"
          />
        </div>

        <div>
          <label className="label">Content (HTML allowed)</label>
          <textarea
            placeholder="Enter post body…"
            rows={8}
            value={post.content}
            onChange={(e) => setPost((p) => ({ ...p, content: e.target.value }))}
            className="input-field resize-y"
          />
        </div>

        <div>
          <label className="label">Publish Status</label>
          <div className="flex gap-3">
            {['publish', 'draft'].map((s) => (
              <button
                key={s}
                onClick={() => setPost((p) => ({ ...p, status: s }))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  post.status === s
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                {s === 'publish' ? '🚀 Publish' : '📄 Draft'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
