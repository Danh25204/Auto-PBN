import { useRef, useEffect } from 'react';

function RichContentEditor({ value, onChange, placeholder, disabled }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || '';
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInput = () => {
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');

    if (html) {
      document.execCommand('insertHTML', false, html);
    } else if (text) {
      const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n\n+/g, '</p><p>')
        .replace(/\n/g, '<br>');
      document.execCommand('insertHTML', false, `<p>${escaped}</p>`);
    }
    if (ref.current) onChange(ref.current.innerHTML);
  };

  return (
    <div
      ref={ref}
      contentEditable={!disabled}
      suppressContentEditableWarning
      onInput={handleInput}
      onPaste={handlePaste}
      data-placeholder={placeholder}
      className={[
        'input-field min-h-[120px] overflow-y-auto',
        '[&_p]:mb-2 [&_h1]:font-bold [&_h1]:text-xl [&_h2]:font-bold [&_h2]:text-lg',
        '[&_h3]:font-bold [&_h3]:text-base [&_strong]:font-bold [&_em]:italic',
        '[&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5',
        '[&:empty]:before:content-[attr(data-placeholder)]',
        '[&:empty]:before:text-gray-500 [&:empty]:before:pointer-events-none',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
      ].join(' ')}
    />
  );
}

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
                <label className="label">
                  Nội dung{' '}
                  <span className="text-gray-500 font-normal text-xs ml-1">
                    (dán từ Google Docs / Word — giữ nguyên định dạng)
                  </span>
                </label>
                <RichContentEditor
                  value={post.content}
                  disabled={locked}
                  placeholder={`Dán nội dung bài ${i + 1} vào đây...`}
                  onChange={(html) => update(i, 'content', html)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
