export default function SiteSetup({ siteUrl, setSiteUrl, postCount, setPostCount, onGenerate, locked }) {
  return (
    <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
        ① Cấu hình site &amp; số bài
      </h2>

      <div className="flex flex-col gap-3">
        <div>
          <label className="label">URL website cần đăng bài</label>
          <input
            type="url"
            placeholder="https://88vns.net"
            value={siteUrl}
            disabled={locked}
            onChange={(e) => setSiteUrl(e.target.value.trim())}
            className="input-field"
          />
        </div>

        <div>
          <label className="label">Số lượng bài viết cần đăng</label>
          <input
            type="number"
            placeholder="Ví dụ: 5"
            min={1}
            max={100}
            value={postCount}
            disabled={locked}
            onChange={(e) => setPostCount(e.target.value)}
            className="input-field"
          />
        </div>

        <button
          onClick={onGenerate}
          disabled={locked}
          className="btn-secondary w-full"
        >
          ✦ Tạo form bài viết
        </button>
      </div>

      <p className="text-xs text-gray-600 mt-3">
        Sau khi bấm "Bắt đầu đăng bài", trình duyệt sẽ tự động mở — bạn đăng nhập thủ công rồi app sẽ tự đăng từng bài.
      </p>
    </section>
  );
}
