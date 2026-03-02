export default function PostsForm({ posts, setPosts, locked }) {
  const update = (index, field, value) => {
    setPosts((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  return (
    <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
        ② Nội dung {posts.length} bài viết
      </h2>

      <div className="flex flex-col gap-5 max-h-[60vh] overflow-y-auto pr-1">
        {posts.map((post, i) => (
          <div key={i} className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
            <p className="text-xs font-semibold text-indigo-400 mb-3">
              Bài viết {i + 1}
            </p>

            <div className="flex flex-col gap-2">
              <div>
                <label className="label">Tiêu đề</label>
                <input
                  type="text"
                  placeholder={`Tiêu đề bài ${i + 1}...`}
                  value={post.title}
                  disabled={locked}
                  onChange={(e) => update(i, 'title', e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="label">Nội dung</label>
                <textarea
                  placeholder={`Nội dung bài ${i + 1}...`}
                  rows={4}
                  value={post.content}
                  disabled={locked}
                  onChange={(e) => update(i, 'content', e.target.value)}
                  className="input-field resize-y"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
