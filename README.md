# Auto PBN - AI-Powered Content Generation System

Hệ thống tạo nội dung tự động với AI cho PBN (Private Blog Network). Tạo hàng loạt bài viết SEO chất lượng cao bằng tiếng Việt hoặc tiếng Anh với OpenAI, quản lý chiến dịch workflow, và tự động đăng lên WordPress sites.

**Auto PBN** - AI-powered content generation system for Private Blog Networks. Generate high-quality SEO articles in Vietnamese or English, manage workflow campaigns, and automatically publish to WordPress sites.

---

##  Tính năng chính / Key Features

-  **AI Article Generation**: Tạo bài viết SEO với OpenAI (GPT-4, GPT-4o-mini)
- **Bilingual Support**: Hỗ trợ tiếng Việt và tiếng Anh
-  **EEAT Compliance**: Bài viết tuân thủ chuẩn Google EEAT
-  **Workflow Campaigns**: Quản lý chiến dịch tạo nội dung hàng loạt
-  **Image Integration**: Tự động tìm ảnh từ Pexels
-  **WordPress Auto-Post**: Đăng bài tự động lên nhiều WordPress sites
-  **Queue Management**: Xử lý hàng loạt với hàng đợi thông minh
-  **Rich Content**: Title variants, meta description, keyword optimization

---

##  Yêu cầu / Prerequisites

- **Node.js 20+**
- **OpenAI API Key** — Đăng ký tại [platform.openai.com](https://platform.openai.com/)
- **Pexels API Key** (optional) — Đăng ký tại [pexels.com/api](https://www.pexels.com/api/)
- WordPress sites với **Application Passwords** (nếu dùng tính năng đăng bài)

---

##  Cài đặt / Quick Start

### 1. Clone repository
```bash
git clone https://github.com/Danh25204/Auto-PBN.git
cd Auto-PBN
```

### 2. Cấu hình environment variables
```bash
cd server
cp .env.example .env
```

Chỉnh sửa `server/.env`:
```env
# OpenAI API Key (BẮT BUỘC / REQUIRED)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Pexels API Key (TÙY CHỌN / OPTIONAL)
PEXELS_API_KEY=your-pexels-api-key-here

# Server Configuration
PORT=3001
CONCURRENCY=5
REQUEST_TIMEOUT_MS=15000
REQUEST_RETRIES=2
```

### 3. Khởi động backend
```bash
cd server
npm install
npm start
# → http://127.0.0.1:3001
```

### 4. Khởi động frontend (terminal khác / separate terminal)
```bash
cd client
npm install
npm run dev
# → http://localhost:5173
```

Mở trình duyệt tại **http://localhost:5173**

---

##  Hướng dẫn sử dụng / Usage

###  Tab Chiến dịch / Workflow Campaign

1. **Chọn ngôn ngữ / Select language**: Tiếng Việt 🇻🇳 hoặc English 🇬🇧
2. **Nhập danh sách chủ đề / Enter topic lists**: Mỗi dòng một chủ đề
3. **Chọn template**: Chọn từ 500+ template có sẵn hoặc tự nhập
4. **Tạo bài viết / Generate articles**: 
   - Chọn OpenAI model (gpt-4o-mini hoặc gpt-4)
   - Click " Generate" để tạo từng bài
   - Click " Chạy Pipeline: Generate All" để tạo hàng loạt
5. **Xem và chỉnh sửa / Review and edit**: Preview bài viết trước khi đăng
6. **Đăng bài tự động / Auto-post**: Đăng lên WordPress sites đã cấu hình

###  Chất lượng bài viết / Article Quality

**Tiếng Việt:**
- Độ dài: 1800+ từ
- Mật độ từ khóa: 20-35 lần (2.0-2.5%)
- Cấu trúc: 5-9 H2 headings với nội dung EEAT
- LSI keywords: Tự động thêm biến thể từ khóa
- 20 mẫu title đa dạng

**English:**
- Length: 1800+ words
- Keyword density: 20-35 times (2.0-2.5%)
- Structure: 5-9 H2 headings with EEAT content
- LSI keywords: Automatic keyword variations
- 20 diverse title formats

---

##  Cấu hình / Configuration

### Environment Variables (`server/.env`)

| Variable              | Mặc định / Default | Mô tả / Description                      |
|-----------------------|--------------------|------------------------------------------|
| `OPENAI_API_KEY`      | *required*         | OpenAI API key (BẮT BUỘC)               |
| `PEXELS_API_KEY`      | *optional*         | Pexels API key cho ảnh                  |
| `PORT`                | `3001`             | Backend port                             |
| `CONCURRENCY`         | `5`                | Số request đồng thời                     |
| `REQUEST_TIMEOUT_MS`  | `15000`            | Timeout mỗi request (ms)                 |
| `REQUEST_RETRIES`     | `2`                | Số lần retry khi lỗi                     |

---

##  Cấu trúc dự án / Project Structure

```
Auto-PBN/
├── server/                    # Express backend
│   ├── src/
│   │   ├── index.js          # Entry point
│   │   ├── routes/
│   │   │   ├── generate.js   # Article generation API
│   │   │   ├── pipeline.js   # Workflow queue management
│   │   │   ├── images.js     # Pexels image search
│   │   │   └── config.js     # Configuration endpoints
│   │   ├── services/
│   │   │   ├── articleGenerator.js  # OpenAI article generation
│   │   │   ├── pipelineQueue.js     # Queue processor
│   │   │   ├── wpApi.js             # WordPress API client
│   │   │   └── logger.js             # Logging utility
│   │   └── validation/
│   ├── data/                 # Generated content (gitignored)
│   └── .env                  # Environment variables (gitignored)
│
├── client/                   # React 18 + Vite + Tailwind
│   └── src/
│       ├── App.jsx          # Main app with tab navigation
│       ├── components/
│       │   ├── WorkflowPanel.jsx     # Campaign management UI
│       │   ├── GeneratePanel.jsx     # Simple generation UI (hidden)
│       │   ├── ArticlePreview.jsx    # Article preview component
│       │   ├── SitesPanel.jsx        # WordPress sites config
│       │   ├── PostsForm.jsx         # Manual posting form
│       │   └── LogPanel.jsx          # Real-time logs
│       ├── hooks/
│       │   └── useJobStream.js       # SSE stream handler
│       └── utils/
│           ├── content.js            # Content processing
│           └── parseCsv.js           # CSV parser
│
└── README.md
```

---

##  Bảo mật / Security Notes

-  **KHÔNG BAO GIỜ commit file `.env`** vào git
- OpenAI API keys được lưu trong `.env` (đã gitignore)
- Backend chỉ bind `127.0.0.1` (không expose ra network)
- Không chia sẻ `server/.env` hoặc `server/data/` folder

---

##  Troubleshooting

### Lỗi "OpenAI API key not found"
```bash
# Kiểm tra file .env có tồn tại không
cat server/.env

# Đảm bảo có dòng:
OPENAI_API_KEY=sk-your-actual-key-here
```

### Bài viết vẫn bằng tiếng Việt khi chọn English
- Kiểm tra console log: `[buildArticlePrompt] language="en"`
- Xóa cache trình duyệt và reload
- Restart server nếu cần

### Lỗi kết nối WordPress
- Kiểm tra Application Password đúng format (có spaces)
- Đảm bảo WordPress bật XML-RPC và REST API
- Test endpoint: `https://yoursite.com/wp-json/wp/v2/posts`

---

##  Changelog

### Version 2.0 (April 2026)
-  Thêm hỗ trợ song ngữ (Vietnamese/English)
-  Workflow Campaign management
-  Queue-based bulk generation
-  Pexels image integration
-  EEAT-compliant article structure
-  20 title format variants per language
-  UI simplification (chỉ hiển thị Workflow tab)

### Version 1.0
- WordPress posting automation
- Basic article generation

---

## 📄 License

MIT License - Xem file LICENSE để biết thêm chi tiết

---

##  Author

GitHub: [@Danh25204](https://github.com/Danh25204)

---

##  Contributing

Pull requests are welcome! For major changes, please open an issue first.

---

** Pro tip:** Sử dụng `gpt-4o-mini` cho tốc độ nhanh và chi phí thấp. Dùng `gpt-4` khi cần chất lượng cao nhất.
