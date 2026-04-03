import OpenAI from 'openai';
import Bottleneck from 'bottleneck';

// ── OpenAI client (lazy init để không crash nếu chưa có key) ─────────────────
let _openai = null;
function getOpenAI() {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY chưa được cấu hình trong .env');
    }
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

// ── Concurrency limiter: max 3 calls cùng lúc ─────────────────────────────
export const limiter = new Bottleneck({ maxConcurrent: 3, minTime: 500 });

const MAX_RETRIES = 3;
const MIN_WORD_COUNT = 1800;

// ── EEAT prompt: Step 1 — viết bài SEO chuẩn ────────────────────────────────
// keyword: từ khóa chính (tự rút từ topic nếu không truyền vào)
// language: 'vi' (Vietnamese) hoặc 'en' (English)
export function buildArticlePrompt(topic, keyword = '', language = 'vi') {
  const kw = (keyword || topic.split(/\s*[—–-]\s*/)[0]).trim();
  
  console.log(`[buildArticlePrompt] language="${language}" | kw="${kw}" | topic="${topic.slice(0, 50)}..."`);
  
  if (language === 'en') {
    console.log('[buildArticlePrompt] Using ENGLISH prompt');
    return buildArticlePromptEnglish(topic, kw);
  } else {
    console.log('[buildArticlePrompt] Using VIETNAMESE prompt');
    return buildArticlePromptVietnamese(topic, kw);
  }
}

// ── Vietnamese Prompt ────────────────────────────────────────────────────────
function buildArticlePromptVietnamese(topic, kw) {

  // Trích aspect từ topic (phần sau dấu —)
  const aspectRaw = (topic.split(/\s*[—–-]\s*/)[1] || '').trim().toLowerCase();

  // Map aspect → nhiều bộ H2 khác nhau, mỗi lần chọn ngẫu nhiên 1 bộ
  const aspectStructureMap = [
    {
      keys: ['tổng quan', 'giới thiệu', 'khái quát', 'toàn cảnh', 'toàn bộ', 'cần nắm', 'điểm qua', 'cẩm nang', 'cái nhìn', 'từ a đến z', 'tổng thể', 'quan trọng nhất', 'cần biết'],  
      style: 'tổng quan',
      h2Variants: [
        [`${kw} là gì — định nghĩa và bức tranh toàn cảnh`, `Lịch sử hình thành và phát triển`, `Các thành phần và tính năng cốt lõi`, `Đối tượng nào phù hợp với ${kw}`, `Những điểm nổi bật và lợi thế cạnh tranh`, `Lưu ý quan trọng khi tiếp cận ${kw}`, `Tổng kết và đánh giá chung`],
        [`Khái niệm cơ bản về ${kw} mà ai cũng cần biết`, `Nguồn gốc và lý do ${kw} ra đời`, `Cơ chế hoạt động thực tế`, `Ai đang dùng ${kw} và tại sao`, `Điểm khác biệt so với các giải pháp thông thường`, `Những hiểu lầm phổ biến cần tránh`, `Tóm tắt những điều cốt lõi nhất`],
        [`${kw} hoạt động như thế nào — giải thích đơn giản`, `Các yếu tố cấu thành nên ${kw}`, `Ưu điểm nổi bật đã được kiểm chứng`, `Hạn chế và điều cần cân nhắc`, `Phù hợp nhất với ai và trong trường hợp nào`, `Những điều cần chuẩn bị trước khi tiếp cận`, `Kết luận — Có đáng tìm hiểu không`],
        [`Tổng quan nhanh về ${kw} trong 5 phút`, `Những con số đáng chú ý về ${kw}`, `Các loại và phiên bản phổ biến`, `So sánh ${kw} và giải pháp truyền thống`, `Cộng đồng người dùng và hệ sinh thái`, `Tiềm năng và giới hạn thực sự`, `Lời khuyên cho người mới bắt đầu tìm hiểu`],
        [`${kw} — nhìn từ góc độ người mới hoàn toàn`, `Tại sao ${kw} lại quan trọng đến vậy`, `Những thành phần không thể thiếu`, `Trải nghiệm thực tế lần đầu tiên`, `5 điều bạn sẽ nhận ra sau khi hiểu rõ ${kw}`, `Những câu hỏi nền tảng được giải đáp`, `Bước tiếp theo sau khi đã nắm tổng quan`],
      ],
    },
    {
      keys: ['hướng dẫn', 'đăng ký', 'từng bước', 'bước thực hiện', 'quy trình', 'bắt đầu ngay', 'thiết lập', 'làm thế nào', 'các bước', 'thực hiện', 'bắt đầu', 'trong 5 phút', 'không bỏ sót', 'chuẩn từ đầu'],  
      style: 'hướng dẫn',
      h2Variants: [
        [`Chuẩn bị trước khi bắt đầu với ${kw}`, `Bước 1 — Đăng ký và tạo tài khoản`, `Bước 2 — Thiết lập cơ bản`, `Bước 3 — Thực hiện lần đầu tiên`, `Bước 4 — Kiểm tra và xác nhận kết quả`, `Các lỗi thường gặp và cách khắc phục`, `Mẹo để hoàn thành nhanh và đúng nhất`],
        [`Điều kiện và những gì cần có trước khi dùng ${kw}`, `Hướng dẫn đăng ký tài khoản chi tiết`, `Thiết lập thông tin và cấu hình ban đầu`, `Thực hiện thao tác đầu tiên thành công`, `Xác minh và hoàn tất quy trình`, `Những lỗi phổ biến người mới hay gặp`, `Checklist kiểm tra lại trước khi kết thúc`],
        [`Yêu cầu cơ bản để sử dụng ${kw}`, `Tạo tài khoản đúng cách — hướng dẫn ảnh chụp từng bước`, `Nạp tiền hoặc xác minh danh tính nếu cần`, `Khám phá giao diện và các mục chính`, `Thực hiện giao dịch hoặc hành động đầu tiên`, `Theo dõi kết quả và kiểm tra lịch sử`, `Tổng kết quy trình và lời khuyên thực tế`],
        [`Trước khi bắt đầu — những điều cần biết về ${kw}`, `Đăng ký nhanh trong dưới 5 phút`, `Xác thực tài khoản và kích hoạt`, `Thực hiện các cài đặt quan trọng không được bỏ qua`, `Bắt đầu sử dụng tính năng chính`, `Theo dõi tiến trình và đánh giá kết quả`, `Mẹo tăng tốc quy trình cho lần tiếp theo`],
        [`Những gì bạn cần chuẩn bị trước khi đăng ký ${kw}`, `Hướng dẫn đăng ký từng bước không bỏ sót`, `Thiết lập hồ sơ và xác minh tài khoản`, `Lần đầu sử dụng — thực hành ngay`, `Kiểm tra lại và tối ưu sau khi hoàn tất`, `Các vấn đề thường gặp và cách xử lý nhanh`, `Câu hỏi hay gặp từ người dùng mới bắt đầu`],
      ],
    },
    {
      keys: ['đánh giá', 'review', 'nhận xét', 'trải nghiệm', 'không tô vẽ', 'nhìn lại', 'khách quan', 'trung thực', 'thực tế', 'người dùng thực', 'sau thời gian', 'có nên dùng'],  
      style: 'đánh giá',
      h2Variants: [
        [`Tổng quan về ${kw} — ấn tượng đầu tiên`, `Đánh giá giao diện và trải nghiệm người dùng`, `Chất lượng dịch vụ và tính năng thực tế`, `Điểm mạnh đáng khen`, `Điểm yếu cần cải thiện`, `So sánh với các lựa chọn tương tự`, `Kết luận — Có nên sử dụng ${kw} không`],
        [`Trải nghiệm thực tế khi dùng ${kw} lần đầu`, `Giao diện có thực sự thân thiện không`, `Chất lượng dịch vụ có đúng như quảng cáo`, `Những điểm khiến tôi thực sự hài lòng`, `Những điểm khiến tôi thất vọng`, `Phản hồi từ cộng đồng người dùng`, `Điểm số tổng thể và khuyến nghị của tôi`],
        [`${kw} nhìn từ con mắt người dùng thực tế`, `Đánh giá thiết kế và tốc độ nền tảng`, `Độ chính xác và hiệu quả của tính năng chính`, `5 điều tôi thích nhất ở ${kw}`, `3 điều tôi muốn ${kw} cải thiện`, `So sánh với đối thủ đã dùng qua`, `Kết luận trung thực — Ai nên dùng, ai không nên`],
        [`Review ${kw} sau thời gian dài sử dụng thực tế`, `Trải nghiệm onboarding — bắt đầu có dễ không`, `Tính năng có đáp ứng đúng nhu cầu thực tế không`, `Dịch vụ hỗ trợ khách hàng thực sự như thế nào`, `Giá trị so với chi phí bỏ ra`, `Đánh giá so với kỳ vọng ban đầu`, `Tôi có tiếp tục dùng ${kw} không — câu trả lời thật`],
        [`${kw} qua nhìn nhận của người dùng lâu năm`, `Cảm nhận ban đầu vs thực tế dài hạn`, `Những điểm mạnh ổn định theo thời gian`, `Những vấn đề vẫn chưa được giải quyết`, `So sánh với kỳ vọng của người mới`, `Bình luận và đánh giá từ cộng đồng`, `Kết luận khách quan và lời khuyên thực tế`],
      ],
    },
    {
      keys: ['so sánh', 'lựa chọn', 'hay không', 'đối thủ', 'khác biệt', 'cân nhắc', 'chọn đúng', 'phổ biến khác', 'cạnh tranh', 'chọn cái nào', 'ai phù hợp'],  
      style: 'so sánh',
      h2Variants: [
        [`Tiêu chí so sánh quan trọng nhất cần biết`, `${kw} — điểm mạnh và điểm yếu`, `Đối thủ cạnh tranh — phân tích từng lựa chọn`, `So sánh trực tiếp về tính năng và giá trị`, `Ai nên chọn ${kw}, ai nên chọn lựa chọn khác`, `Bảng so sánh tổng hợp`, `Kết luận — Lựa chọn phù hợp nhất cho từng đối tượng`],
        [`Tại sao phải so sánh trước khi quyết định`, `Điểm mạnh của ${kw} so với thị trường`, `Điểm yếu mà đối thủ làm tốt hơn`, `So sánh chi tiết theo từng tiêu chí quan trọng`, `Chi phí và giá trị thực sự của mỗi lựa chọn`, `Phù hợp theo từng nhóm nhu cầu`, `Kết luận — Không có lựa chọn hoàn hảo, chỉ có lựa chọn phù hợp`],
        [`Bức tranh tổng quan về các lựa chọn hiện có`, `${kw} so với lựa chọn phổ biến nhất`, `${kw} so với lựa chọn rẻ nhất trên thị trường`, `Tính năng nổi bật mà chỉ ${kw} có`, `Điểm yếu mà bạn cần biết trước khi chọn`, `Ma trận quyết định — Ai nên chọn cái nào`, `Tổng kết và gợi ý lựa chọn theo từng trường hợp`],
        [`Những câu hỏi cần trả lời trước khi so sánh`, `${kw} dẫn đầu ở điểm nào`, `Đối thủ vượt trội ở điểm nào`, `Trải nghiệm người dùng thực tế của từng lựa chọn`, `Chi phí ẩn và tổng chi phí thực sự`, `Kết quả thực tế từ người đã thử cả hai`, `Quyết định cuối cùng — Tôi sẽ chọn gì và tại sao`],
        [`Cách đánh giá khách quan một nền tảng như ${kw}`, `Phân tích ${kw} theo 5 tiêu chí quan trọng nhất`, `Hai đối thủ đáng gờm nhất hiện nay`, `Ai thắng ở từng hạng mục`, `Đánh giá tổng thể theo nhu cầu người dùng`, `Những cạm bẫy khi so sánh dựa vào quảng cáo`, `Kết luận — Lời khuyên từ người đã trải qua cả ba`],
      ],
    },
    {
      keys: ['kinh nghiệm', 'bài học', 'sai lầm', 'xương máu', 'ước mình biết', 'người trong cuộc', 'chia sẻ', 'câu chuyện', 'hành trình', 'đã trải qua', 'từ người đã'],  
      style: 'kinh nghiệm',
      h2Variants: [
        [`Hành trình thực tế của tôi với ${kw}`, `Những sai lầm tôi đã mắc phải và bài học rút ra`, `Điều gì thực sự hoạt động tốt`, `Điều gì không như kỳ vọng`, `Lời khuyên thực tế từ người đã trải qua`, `Những điều tôi ước mình biết sớm hơn`, `Kết luận — Kinh nghiệm thực tế đáng giá`],
        [`Lần đầu tôi biết đến ${kw} — câu chuyện thật`, `Giai đoạn mò mẫm và những lỗi sai cay đắng`, `Khoảnh khắc mọi thứ bắt đầu vận hành tốt`, `Những thứ tôi đã bỏ quá nhiều thời gian vào`, `Bí quyết giúp tôi tiến nhanh hơn`, `Lời khuyên thực tế từ người đã đi trước`, `Nếu bắt đầu lại, tôi sẽ làm khác gì`],
        [`Con đường từ người hoàn toàn mới đến người dùng thành thạo ${kw}`, `3 sai lầm lớn nhất trong giai đoạn đầu`, `Điểm bước ngoặt — khi mọi thứ thay đổi`, `Những chiến lược hoạt động thực sự trong thực tế`, `Những thứ không hoạt động dù nhiều người khuyên`, `Tổng hợp bài học giá trị nhất sau quá trình dài`, `Lời nhắn gửi đến người đang đứng trước ngưỡng cửa`],
        [`Tôi đã dùng ${kw} như thế nào trong thời gian qua`, `Những điều ngạc nhiên tôi không ngờ tới`, `Thách thức lớn nhất và cách tôi vượt qua`, `Kết quả thực tế sau thời gian dài kiên trì`, `So sánh kỳ vọng ban đầu và thực tế nhận được`, `Điều hối tiếc duy nhất trong hành trình này`, `Chia sẻ cuối cùng cho người đang cân nhắc`],
        [`Kinh nghiệm đúc kết sau hành trình với ${kw}`, `Những sai lầm phổ biến mà ai cũng dễ mắc`, `Chiến lược đã giúp tôi đạt kết quả tốt hơn`, `Tư duy đúng để thành công với ${kw}`, `Những nguồn tài nguyên và công cụ hỗ trợ hữu ích nhất`, `Tổng hợp bài học không sách nào dạy`, `Hành trình tiếp theo — tôi đang làm gì bây giờ`],
      ],
    },
    {
      keys: ['mẹo', 'thủ thuật', 'bí quyết', 'bí kíp', 'tối ưu', 'tiết kiệm', 'hiệu quả hơn', 'vượt trội', 'chiến lược', 'tối ưu hóa', 'nâng cao hiệu suất', 'cải thiện kết quả', 'đạt kết quả'],  
      style: 'mẹo',
      h2Variants: [
        [`Mẹo nền tảng mọi người dùng cần biết`, `5 thủ thuật giúp tiết kiệm thời gian đáng kể`, `Cách tối ưu hóa kết quả một cách thông minh`, `Những tính năng ẩn ít người khai thác`, `Lỗi phổ biến và cách tránh ngay từ đầu`, `Chiến lược nâng cao cho người muốn vượt trội`, `Tổng hợp checklist áp dụng ngay hôm nay`],
        [`Trước khi dùng mẹo — nền tảng bạn phải vững`, `Mẹo số 1 giúp tăng hiệu quả ngay lập tức`, `Mẹo số 2 và 3 — ít ai nghĩ đến nhưng cực kỳ hữu ích`, `Công cụ và tài nguyên hỗ trợ đắc lực nhất`, `Cách tránh những lỗi làm mất thời gian vô ích`, `Phối hợp nhiều mẹo cùng lúc để có kết quả tốt nhất`, `Lịch trình thực hành và theo dõi kết quả`],
        [`Tại sao hầu hết người dùng ${kw} chưa đạt tối đa tiềm năng`, `Mẹo tiết kiệm thời gian mà dân chuyên nghiệp hay dùng`, `Cách thiết lập workflow tối ưu cho ${kw}`, `Những phím tắt và thao tác nhanh ít tài liệu đề cập`, `Cách đọc và phân tích kết quả thông minh hơn`, `Tích hợp và kết hợp với công cụ khác để tăng sức mạnh`, `Bộ checklist cá nhân hóa cho từng mục tiêu khác nhau`],
        [`Sự khác biệt giữa người dùng thường và người dùng giỏi ${kw}`, `6 mẹo nhỏ tạo ra khác biệt lớn`, `Cách phân tích và đọc dữ liệu thông minh hơn`, `Tối ưu hóa từng bước nhỏ để có kết quả lớn`, `Những lỗi tinh vi làm giảm hiệu quả mà ít ai ngờ tới`, `Bí quyết từ người dùng kinh nghiệm nhất`, `Tổng hợp và áp dụng — kế hoạch 30 ngày`],
        [`Nền tảng tư duy để áp dụng mẹo hiệu quả với ${kw}`, `Hệ thống hóa quy trình thay vì làm theo cảm tính`, `Mẹo xử lý tình huống khó hay gặp`, `Cách ưu tiên và tập trung vào điều quan trọng nhất`, `Đo lường và cải thiện liên tục`, `Học từ người giỏi nhất trong cộng đồng ${kw}`, `Kế hoạch hành động cụ thể từ ngày mai`],
      ],
    },
    {
      keys: ['câu hỏi', 'thường gặp', 'faq', 'hay hỏi', 'thắc mắc', 'hỏi đáp', 'giải đáp', 'ai cũng có', 'tất cả câu hỏi', 'đặt ra'],  
      style: 'faq',
      h2Variants: [
        [`${kw} là gì và hoạt động như thế nào`, `Làm thế nào để bắt đầu sử dụng ${kw}`, `Chi phí và điều kiện tham gia`, `Các vấn đề và lỗi người dùng hay gặp nhất`, `${kw} có an toàn và đáng tin cậy không`, `So với lựa chọn khác thì ${kw} có gì khác biệt`, `Tổng hợp câu trả lời nhanh hay được hỏi nhất`],
        [`Câu hỏi 1 — ${kw} phù hợp với đối tượng nào`, `Câu hỏi 2 — Cần bao nhiêu thời gian để làm quen`, `Câu hỏi 3 — Chi phí thực tế là bao nhiêu`, `Câu hỏi 4 — Có cần kỹ năng gì đặc biệt không`, `Câu hỏi 5 — Kết quả thực tế có như quảng cáo không`, `Câu hỏi 6 — Phải làm gì khi gặp sự cố`, `Câu hỏi 7 — Có nên giới thiệu cho người khác không`],
        [`Những gì người mới thường thắc mắc về ${kw}`, `Giải đáp về tính hợp lệ và điều khoản sử dụng`, `Giải đáp về vấn đề kỹ thuật phổ biến`, `Giải đáp về thanh toán và quyền lợi người dùng`, `Giải đáp về độ an toàn và bảo mật`, `Giải đáp từ cộng đồng người dùng thực tế`, `Câu hỏi nâng cao dành cho người dùng lâu năm`],
        [`Hiểu sai phổ biến về ${kw} cần được làm rõ`, `Câu hỏi về việc bắt đầu và yêu cầu cơ bản`, `Câu hỏi về tính năng và giới hạn`, `Câu hỏi về so sánh với lựa chọn khác`, `Câu hỏi về vấn đề pháp lý và điều khoản`, `Câu hỏi về hỗ trợ và giải quyết khiếu nại`, `Tổng hợp giải đáp nhanh và chính xác nhất`],
        [`Người mới thường bắt đầu với câu hỏi gì về ${kw}`, `Câu hỏi về chất lượng dịch vụ thực tế`, `Câu hỏi về độ tin cậy và uy tín`, `Câu hỏi về cách tối ưu kết quả`, `Câu hỏi về rủi ro và cách phòng ngừa`, `Câu hỏi về tương lai và phát triển của ${kw}`, `Giải đáp tổng hợp từ chuyên gia và người dùng kinh nghiệm`],
      ],
    },
    {
      keys: ['lợi ích', 'giá trị', 'tại sao nên', 'xứng đáng', 'thay đổi tích cực', 'nhận được', 'tại sao quan tâm', 'lý do xứng đáng', 'những lợi ích', 'giá trị thực', 'tại sao nhiều người'],  
      style: 'lợi ích',
      h2Variants: [
        [`Lợi ích số 1 — điều làm thay đổi cách nhìn của người dùng`, `Tiết kiệm thời gian và nguồn lực nhờ ${kw}`, `Giá trị thực sự so với chi phí bỏ ra`, `Lợi ích dài hạn ít ai nhận ra ngay`, `Ảnh hưởng tích cực đến kết quả thực tế`, `Những trường hợp ${kw} tạo ra sự khác biệt thực sự`, `Kết luận — Tại sao lợi ích này xứng đáng với sự quan tâm`],
        [`Lý do số 1 khiến mọi người chọn ${kw}`, `Tiết kiệm được gì khi sử dụng ${kw}`, `Cải thiện nào rõ rệt nhất trong thực tế`, `Lợi ích ngắn hạn — thấy ngay từ lần đầu dùng`, `Lợi ích dài hạn — tích lũy theo thời gian`, `Câu chuyện thực tế về sự thay đổi nhờ ${kw}`, `Tổng kết — Giá trị thực sự bạn nhận được là gì`],
        [`Tại sao ${kw} đang ngày càng được nhiều người quan tâm`, `Lợi ích về mặt thời gian và công sức`, `Lợi ích về mặt tài chính và chi phí`, `Lợi ích về trải nghiệm và sự tiện lợi`, `Lợi ích về mặt kết quả và hiệu suất`, `Những thay đổi tích cực người dùng phản hồi nhiều nhất`, `Kết luận — Có xứng đáng để bạn đầu tư thời gian không`],
        [`Bức tranh toàn cảnh về giá trị ${kw} mang lại`, `5 lợi ích thiết thực được người dùng ghi nhận`, `So sánh trước và sau khi sử dụng ${kw}`, `Những lợi ích bất ngờ ít ai kể đến`, `Giá trị cộng thêm từ cộng đồng và hỗ trợ`, `Đánh giá giá trị theo từng nhóm người dùng khác nhau`, `Kết luận — Liệu ${kw} có thực sự xứng đáng với sự kỳ vọng`],
        [`Điều gì khiến ${kw} thực sự có giá trị với người dùng`, `Lợi ích về trải nghiệm hằng ngày`, `Tác động tích cực đến năng suất và kết quả`, `Lợi ích khi so sánh với làm thủ công hoặc không dùng gì`, `Những lợi ích ít được nói đến nhưng thực sự quan trọng`, `Đánh giá giá trị sau 1 tuần, 1 tháng và dài hơn`, `Quyết định có nên bắt đầu không — phân tích cuối cùng`],
      ],
    },
    {
      keys: ['rủi ro', 'cảnh báo', 'cần tránh', 'cạm bẫy', 'nguy hiểm', 'dấu hiệu', 'phòng tránh', 'vấn đề thường gặp', 'điều gì có thể', 'làm sai', 'bảo vệ bản thân', 'nếu làm sai'],  
      style: 'rủi ro',
      h2Variants: [
        [`Rủi ro phổ biến nhất mà người mới hay gặp`, `Những dấu hiệu cảnh báo cần chú ý ngay`, `Cạm bẫy tinh vi mà ít ai nhận ra`, `Cách phòng tránh rủi ro một cách hiệu quả`, `Phải làm gì khi sự cố xảy ra`, `Các công cụ và biện pháp bảo vệ hữu ích`, `Kết luận — Sử dụng an toàn và có trách nhiệm`],
        [`Hiểu đúng về rủi ro khi dùng ${kw}`, `Những sai lầm phổ biến dẫn đến hậu quả không mong muốn`, `Dấu hiệu nhận biết nền tảng hoặc người dùng không đáng tin`, `Cách giảm thiểu rủi ro từ ngay lần đầu tiên`, `Xử lý tình huống khi đã gặp vấn đề`, `Kinh nghiệm từ người từng gặp rủi ro và hồi phục`, `Kết luận — Cân bằng giữa rủi ro và lợi ích`],
        [`Những cạm bẫy mà người dùng mới dễ rơi vào với ${kw}`, `Cảnh báo về các chiêu trò và thủ đoạn phổ biến`, `Rủi ro tài chính và cách kiểm soát`, `Rủi ro bảo mật và thông tin cá nhân`, `Rủi ro tâm lý và cách duy trì tỉnh táo`, `Những biện pháp bảo vệ bản thân thực tế nhất`, `Tóm tắt — Nguyên tắc an toàn không được bỏ qua`],
        [`Tại sao nhiều người gặp rủi ro với ${kw} là do thiếu thông tin`, `Rủi ro số 1 — phổ biến nhất và dễ tránh nhất`, `Rủi ro số 2 và 3 — tinh vi hơn nhưng vẫn phòng được`, `Công thức phòng tránh rủi ro từ chuyên gia`, `Kế hoạch hành động khi đã rơi vào tình huống xấu`, `Những nguồn hỗ trợ đáng tin cậy khi cần`, `Lời kết — Thận trọng không có nghĩa là không dùng`],
        [`Nhìn thẳng vào mặt tối của ${kw} mà không ai nói thật`, `Những con số và thực tế phũ phàng cần biết`, `Ai dễ bị tổn thương và tại sao`, `Bước đầu tiên để tự bảo vệ bản thân`, `Hệ thống phòng thủ nhiều lớp cho người dùng thông minh`, `Xây dựng thói quen an toàn bền vững`, `Kết luận — Rủi ro là có thật nhưng có thể kiểm soát được`],
      ],
    },
    {
      keys: ['ưu điểm', 'tính năng', 'điểm mạnh', 'lý do nên chọn', 'độc đáo', 'người sử dụng', 'điểm cộng', 'đáng chú ý', 'nổi trội', 'ngày càng nhiều', 'lý do nhiều người', 'tin tưởng lựa chọn'],  
      style: 'tính năng',
      h2Variants: [
        [`Tính năng nổi bật số 1 — điều làm ${kw} khác biệt`, `Ưu điểm về giao diện và trải nghiệm sử dụng`, `Sức mạnh kỹ thuật và hiệu suất thực tế`, `Các tính năng ẩn đáng khám phá`, `Điểm yếu và giới hạn hiện tại`, `So sánh với phiên bản cũ hoặc lựa chọn tương tự`, `Kết luận — Tính năng nào đáng giá nhất`],
        [`Tổng quan hệ thống tính năng của ${kw}`, `Tính năng cốt lõi hoạt động như thế nào`, `Điểm khác biệt so với đối thủ cùng phân khúc`, `Tính năng mới nhất và đáng chú ý`, `Những tính năng bị đánh giá thấp nhưng thực ra rất hữu ích`, `Giới hạn và tính năng cần cải thiện`, `Đánh giá tổng thể hệ thống tính năng`],
        [`Phân loại tính năng theo nhóm chức năng`, `Tính năng dành cho người mới — dễ dùng và hiệu quả ngay`, `Tính năng nâng cao dành cho người có kinh nghiệm`, `Tính năng bảo mật và quản lý tài khoản`, `Tính năng hỗ trợ và chăm sóc khách hàng`, `Lộ trình phát triển tính năng trong tương lai`, `Điểm tính năng tổng hợp và so sánh với thị trường`],
        [`Tại sao hệ thống tính năng của ${kw} được đánh giá cao`, `5 tính năng tôi dùng nhiều nhất và lý do`, `Tính năng nào thực sự tạo ra lợi thế cạnh tranh`, `Những tính năng tôi chưa dùng đến — tìm hiểu có đáng không`, `Ưu và nhược điểm của từng tính năng chính`, `Tính năng nào phù hợp với mục tiêu cụ thể của bạn`, `Kết luận — Bộ tính năng này có đáp ứng nhu cầu của bạn không`],
        [`Khám phá ${kw} từ góc nhìn tính năng và công nghệ`, `Ưu điểm về tốc độ và độ ổn định`, `Ưu điểm về tính đa dạng và linh hoạt`, `Ưu điểm về bảo mật và an toàn dữ liệu`, `Ưu điểm về hỗ trợ đa nền tảng`, `Những điểm còn hạn chế cần lưu ý`, `Xu hướng phát triển tính năng trong thời gian tới`],
      ],
    },
    {
      keys: ['an toàn', 'bảo mật', 'uy tín', 'tin cậy', 'kiểm tra', 'độ uy tín', 'độ tin cậy', 'đánh giá độ'],  
      style: 'an toàn',
      h2Variants: [
        [`Tiêu chí đánh giá độ uy tín của ${kw}`, `Các biện pháp bảo mật được áp dụng`, `Giấy phép hoạt động và tính hợp pháp`, `Phản hồi từ cộng đồng người dùng thực tế`, `Những dấu hiệu nhận biết nền tảng không đáng tin`, `Cách người dùng tự bảo vệ bản thân`, `Kết luận — Có đáng tin cậy không`],
        [`Hệ thống bảo mật của ${kw} hoạt động thế nào`, `Chứng chỉ và tiêu chuẩn an toàn đang áp dụng`, `Cách ${kw} xử lý và bảo vệ dữ liệu người dùng`, `Lịch sử sự cố và cách xử lý của nền tảng`, `So sánh mức độ an toàn với các đối thủ`, `Người dùng cần làm gì để tăng cường bảo vệ bản thân`, `Kết luận — Mức độ tin cậy tổng thể`],
        [`Những câu hỏi về an toàn mà người dùng hay đặt ra với ${kw}`, `Kiểm tra giấy phép và tư cách pháp lý`, `Đánh giá hệ thống mã hóa và bảo vệ giao dịch`, `Phản hồi thực tế từ người dùng về độ tin cậy`, `Những rủi ro bảo mật tiềm ẩn và cách giảm thiểu`, `Quy trình xử lý khiếu nại và bảo vệ quyền lợi người dùng`, `Kết luận — An toàn hay không — câu trả lời thẳng thắn`],
        [`Cách nhận biết ${kw} có thực sự uy tín hay không`, `5 tiêu chí kiểm tra độ an toàn của bất kỳ nền tảng nào`, `${kw} đạt tiêu chí nào, chưa đạt tiêu chí nào`, `Phản ánh từ người dùng thực tế qua thời gian dài`, `So sánh uy tín với các đối thủ cùng phân khúc`, `Những bước tự kiểm tra an toàn trước khi tham gia`, `Kết luận — Đánh giá độ tin cậy tổng thể`],
        [`Minh bạch là gì khi nói về ${kw}`, `Công khai thông tin và trách nhiệm giải trình`, `Chính sách bảo vệ người dùng có thực chất không`, `Cộng đồng người dùng nói gì về mức độ an toàn`, `Các biện pháp chủ động bảo vệ tài khoản`, `Quy trình xử lý tranh chấp và hoàn tiền`, `Lời kết — Tin tưởng có cơ sở hay chỉ là cảm tính`],
      ],
    },
    {
      keys: ['xu hướng', 'triển vọng', 'tương lai', 'thay đổi', 'phát triển mới', 'định hình', 'những thay đổi', 'nổi bật gần đây', 'đang định hình', 'phát triển đáng chú ý'],  
      style: 'xu hướng',
      h2Variants: [
        [`Bức tranh hiện tại của lĩnh vực ${kw}`, `Xu hướng đang nổi lên và tại sao quan trọng`, `Những thay đổi lớn đã và đang diễn ra`, `Cơ hội và thách thức trong thời gian tới`, `Dự báo và định hướng phát triển`, `${kw} cần chuẩn bị gì cho giai đoạn tiếp theo`, `Kết luận — Hành động ngay để không bị bỏ lại phía sau`],
        [`Lĩnh vực ${kw} đang đứng ở đâu trong bức tranh lớn hơn`, `Những tín hiệu thay đổi rõ rệt nhất gần đây`, `Công nghệ và yếu tố đang định hình lại cuộc chơi`, `Ai đang dẫn đầu xu hướng và tại sao`, `Cơ hội nào đang mở ra cho người dùng thông minh`, `Dự báo ngắn hạn và dài hạn từ chuyên gia`, `Kết luận — Chuẩn bị và thích nghi để không bị lạc hậu`],
        [`Phân tích xu hướng lớn nhất đang ảnh hưởng đến ${kw}`, `Những công nghệ mới đang thay đổi cách dùng ${kw}`, `Sự thay đổi hành vi người dùng và tác động của nó`, `Thị trường đang đi đến đâu trong 2-3 năm tới`, `Những tên tuổi đang định hình tương lai lĩnh vực`, `Người dùng cần làm gì để nắm bắt cơ hội`, `Tổng kết — Xu hướng nào quan trọng nhất với bạn`],
        [`Nhìn lại để hiểu về xu hướng tương lai của ${kw}`, `3 xu hướng đang thay đổi cuộc chơi mạnh nhất`, `Tác động đến người dùng phổ thông và chuyên nghiệp`, `Những cơ hội ít người chú ý đến`, `Rủi ro khi không theo kịp xu hướng`, `Cách cập nhật và thích nghi theo xu hướng mới`, `Lời khuyên cuối — Đừng đứng ngoài khi mọi thứ đang thay đổi`],
        [`Tại sao xu hướng của ${kw} đang được giới chuyên gia quan tâm`, `Số liệu và dữ liệu thực tế về sự tăng trưởng`, `Những nhân tố thúc đẩy thay đổi mạnh nhất`, `Đâu là điểm bứt phá có thể xảy ra sớm`, `Ảnh hưởng của xu hướng này đến trải nghiệm người dùng`, `Người mới và người cũ cần chuẩn bị khác nhau thế nào`, `Kết luận — Xu hướng này tác động đến bạn như thế nào`],
      ],
    },
    {
      keys: ['nâng cao', 'chuyên sâu', 'lâu năm', 'khai thác', 'tầm cao', 'chuyên gia', '90%', 'tính năng ẩn', 'kỹ năng nâng cao', 'người dùng lâu', 'khai thác tối đa', 'tầm cao mới', 'từ người dùng bình thường'],  
      style: 'nâng cao',
      h2Variants: [
        [`Từ người dùng cơ bản đến chuyên gia — lộ trình rõ ràng`, `Kỹ thuật nâng cao mà ít tài liệu đề cập`, `Cách khai thác tối đa tiềm năng của ${kw}`, `Tùy chỉnh và tối ưu hóa chuyên sâu`, `Tích hợp với các công cụ khác để tăng sức mạnh`, `Những sai lầm của người dùng lâu năm cần tránh`, `Kết luận — Bước tiếp theo cho người muốn thực sự thành thạo`],
        [`Dấu hiệu bạn đã sẵn sàng học ${kw} ở cấp độ nâng cao`, `Kỹ thuật chuyên sâu mà người mới chưa thể tiếp cận`, `Tối ưu hóa workflow và tự động hóa những việc lặp lại`, `Phân tích dữ liệu và đọc chỉ số như chuyên gia`, `Chiến lược dài hạn mà chỉ người dùng có kinh nghiệm mới nghĩ đến`, `Cộng đồng và nguồn tài nguyên cho người dùng cấp cao`, `Kế hoạch phát triển bản thân tiếp theo với ${kw}`],
        [`Những rào cản người dùng trung bình thường mắc kẹt`, `Tư duy hệ thống thay vì xử lý từng vấn đề nhỏ lẻ`, `Tự động hóa và tối ưu những tác vụ tốn thời gian nhất`, `Khai thác tính năng API hoặc tích hợp nâng cao`, `Phân tích hiệu suất và điều chỉnh chiến lược`, `Xây dựng kiến thức chuyên sâu và chia sẻ với cộng đồng`, `Lộ trình 90 ngày để trở thành người dùng cấp cao`],
        [`So sánh cách người mới và người chuyên nghiệp dùng ${kw}`, `Chiến lược nâng cao đã được kiểm chứng thực tế`, `Tối ưu hóa chi tiết từng bước trong quy trình`, `Những sai lầm tinh vi chỉ người có kinh nghiệm mới nhận ra`, `Khai thác tối đa hệ sinh thái xung quanh ${kw}`, `Đo lường, phân tích và cải thiện liên tục`, `Kết luận — Hành trình không có điểm dừng cuối cùng`],
        [`Nâng cấp tư duy để dùng ${kw} như một chuyên gia thực thụ`, `Những kỹ thuật ít được chia sẻ công khai`, `Cách thiết lập hệ thống thay vì phụ thuộc vào cảm tính`, `Học từ dữ liệu thực tế thay vì lý thuyết`, `Kết hợp kinh nghiệm dày dạn với công cụ mới`, `Chia sẻ kiến thức và xây dựng uy tín trong cộng đồng`, `Nhìn về phía trước — ${kw} sẽ đưa bạn đến đâu`],
      ],
    },
    {
      keys: ['khắc phục', 'giải pháp', 'sự cố', 'không hoạt động', 'cách sửa', 'vấn đề', 'xử lý', 'giải quyết', 'triệt để', 'từng bước', 'chuyên nghiệp', 'lỗi thường gặp'],  
      style: 'khắc phục',
      h2Variants: [
        [`Những sự cố phổ biến nhất với ${kw}`, `Chẩn đoán nhanh — xác định đúng vấn đề`, `Giải pháp cho lỗi số 1 — hướng dẫn từng bước`, `Giải pháp cho lỗi số 2 và 3`, `Khi nào cần liên hệ hỗ trợ kỹ thuật`, `Cách phòng tránh sự cố tái diễn`, `Kết luận — Checklist xử lý sự cố hiệu quả`],
        [`Tại sao người dùng hay gặp vấn đề với ${kw}`, `Phân loại các loại sự cố theo mức độ nghiêm trọng`, `Hướng dẫn tự khắc phục lỗi cơ bản trong 5 phút`, `Xử lý lỗi trung bình — cần nhiều bước hơn`, `Khi sự cố vượt quá khả năng tự xử lý`, `Cách ghi chép lỗi và báo cáo cho bộ phận hỗ trợ hiệu quả`, `Tổng hợp giải pháp và phòng ngừa từ A đến Z`],
        [`Bản đồ sự cố phổ biến với ${kw} từ A đến Z`, `Quy trình chẩn đoán chuẩn trước khi xử lý`, `Sự cố về đăng nhập và tài khoản — giải quyết cụ thể`, `Sự cố về chức năng chính — hướng dẫn khắc phục`, `Sự cố về thanh toán và giao dịch`, `Escalate thế nào khi không tự xử lý được`, `Xây dựng thói quen phòng ngừa sự cố dài hạn`],
        [`Nhận biết triệu chứng để chẩn đoán đúng vấn đề`, `Checklist kiểm tra nhanh trước khi xử lý bất kỳ sự cố nào`, `Giải pháp cho 5 vấn đề hay gặp nhất`, `Khi nào nên thử xử lý, khi nào nên gọi hỗ trợ ngay`, `Cách lưu lại và học từ mỗi sự cố đã gặp`, `Cập nhật và bảo trì định kỳ để giảm sự cố`, `Kết luận — Tư duy xử lý vấn đề chủ động thay vì bị động`],
        [`Người dùng ${kw} thường gặp khó khăn ở đâu nhất`, `Lỗi hay bị hiểu sai và thực ra dễ sửa hơn bạn nghĩ`, `Quy trình từng bước để xử lý sự cố triệt để`, `Công cụ và tài nguyên hỗ trợ khắc phục`, `Cộng đồng và diễn đàn nơi bạn có thể tìm giải pháp nhanh`, `Những thói quen tốt giúp giảm thiểu sự cố trong tương lai`, `Kết luận — Gặp vấn đề không phải điều đáng sợ nếu biết cách xử lý`],
      ],
    },
  ];

  // Tìm cấu trúc phù hợp với aspect
  const matched = aspectStructureMap.find(m =>
    m.keys.some(k => aspectRaw.includes(k))
  );

  // Chọn ngẫu nhiên 1 bộ H2 từ các variants → tránh lặp khi cùng aspect
  const pickVariant = (variants) => variants[Math.floor(Math.random() * variants.length)];

  // Fallback: nếu không khớp aspect nào → chọn ngẫu nhiên 1 trong 5 bộ H2 đa dạng
  const fallbackVariants = [
    [`${kw} là gì và tại sao ngày càng được quan tâm`, `Những điểm nổi bật khiến ${kw} trở nên phổ biến`, `Hướng dẫn bắt đầu với ${kw} từ con số 0`, `Kinh nghiệm thực tế và những điều cần lưu ý`, `So sánh với các lựa chọn khác trên thị trường`, `Câu hỏi thường gặp khi sử dụng ${kw}`, `Kết luận và khuyến nghị cuối cùng`],
    [`Toàn cảnh về ${kw} qua góc nhìn người dùng thực tế`, `Ưu và nhược điểm quan trọng nhất cần biết`, `Cách bắt đầu và thiết lập đúng cách`, `Những mẹo giúp tận dụng tối đa ${kw}`, `Các rủi ro cần lưu ý và cách phòng tránh`, `So sánh giá trị và chi phí so với lựa chọn khác`, `Tổng kết — Có nên chọn ${kw} hay không`],
    [`Tại sao ${kw} được đề cập nhiều đến vậy`, `Cách hoạt động và cơ chế thực sự đằng sau`, `Lợi ích thực tế mà người dùng đang nhận được`, `Quy trình sử dụng đúng cách từng bước`, `Những sai lầm phổ biến nhất cần tránh ngay`, `Đánh giá tổng thể từ người dùng thực tế`, `Kết luận và lời khuyên cho người muốn bắt đầu`],
    [`Khám phá ${kw} từ nhiều góc độ khác nhau`, `Những điều bạn cần biết trước khi tham gia`, `Bước đầu tiên quan trọng nhất khi dùng ${kw}`, `Chiến lược và mẹo từ người dùng có kinh nghiệm`, `Những vấn đề hay gặp và giải pháp thực tế`, `${kw} so với kỳ vọng — thực tế như thế nào`, `Tổng hợp mọi thứ bạn cần biết trước khi quyết định`],
    [`Nhìn toàn diện về ${kw} không bỏ sót điều gì`, `Đối tượng phù hợp và không phù hợp với ${kw}`, `Cơ chế và nguyên lý hoạt động thực sự`, `Hướng dẫn thực hành nhanh cho người mới`, `Kinh nghiệm từ cộng đồng người dùng`, `Phân tích chi phí — lợi ích thực tế`, `Quyết định cuối cùng có cơ sở vững chắc`],
  ];
  const fallbackH2s = pickVariant(fallbackVariants);

  const structureH2s = matched ? pickVariant(matched.h2Variants) : fallbackH2s;
  const structureNote = matched
    ? `BÀI VIẾT NÀY CÓ DẠNG: "${matched.style.toUpperCase()}" — cấu trúc và nội dung phải bám sát góc độ này.`
    : `BÀI VIẾT TỔNG QUÁT — đảm bảo mỗi H2 có góc nhìn KHÁC NHAU, không lặp lại.`;

  // LSI / semantic keyword variants — AI dùng xen kẽ để tăng topical authority
  const lsiVariants = [kw, `${kw} uy tín`, `${kw} chính thống`, `${kw} an toàn`, `dịch vụ ${kw}`, `nền tảng ${kw}`];

  return `⛔ QUY TẮC TOÀN CỤC (ưu tiên cao nhất): TUYỆT ĐỐI KHÔNG viết bất kỳ năm 4 chữ số nào (2020, 2021, 2022, 2023, 2024, 2025, 2026 hoặc bất kỳ năm nào khác). Vi phạm quy tắc này là sai hoàn toàn. ĐƯỢC dùng tháng (tháng 3, quý 1...).

Bạn là chuyên gia SEO 10+ năm kinh nghiệm. Hãy viết một bài viết chuẩn EEAT bằng tiếng Việt về chủ đề: "${topic}".
Focus Keyword (từ khóa chính): "${kw}"
LSI / Semantic Keywords (dùng xen kẽ tự nhiên trong bài): ${lsiVariants.join(' | ')}

${structureNote}

CẤU TRÚC BÀI VIẾT BẮT BUỘC — Sử dụng chính xác các tiêu đề H2 sau (có thể điều chỉnh câu chữ cho tự nhiên hơn, GIỮ ĐỦ 7 mục và đúng góc độ):
${structureH2s.map((h, i) => `${i + 1}. ${h}`).join('\n')}

LƯU Ý tiêu đề H2: Giữ "${kw}" trong ít nhất 2–3 H2 để đạt keyword density. Các H2 còn lại dùng LSI hoặc đại từ thay thế.

⚠️ QUY TẮC KEYWORD DENSITY — ƯU TIÊN CAO NHẤT:
Focus Keyword "${kw}" phải xuất hiện: mục tiêu 20–35 lần (density ~2.0–2.5%).
- Tối thiểu bắt buộc: 20 lần. Dưới 20 lần → bài bị loại.
- Tối đa cho phép: 40 lần. Không vượt 2.5%.

QUY TẮC PHÂN BỐ KEYWORD "${kw}":
1. 100 từ ĐẦU TIÊN: phải chứa "${kw}" ít nhất 2 lần (bắt buộc — tín hiệu on-page quan trọng).
2. H2: ít nhất 2–3 tiêu đề H2 chứa "${kw}" trực tiếp.
3. Body: rải đều "${kw}" mỗi ~120–150 từ — khoảng 2–3 đoạn <p> liên tiếp thì có 1 lần keyword.
4. KHÔNG nhồi keyword trong mọi câu — câu khác dùng LSI: ${lsiVariants.slice(1).join(', ')}.
5. KHÔNG bắt đầu câu bằng keyword đơn thuần. Đúng: "Nhiều người chọn ${kw} vì..." / "Khi dùng ${kw}..."
6. TUYỆT ĐỐI KHÔNG đề cập năm 4 chữ số trong bài.

🔢 SELF-CHECK trước khi trả kết quả: Đếm số lần "${kw}" xuất hiện. Nếu < 20 lần → bổ sung thêm vào các đoạn còn thiếu.

YÊU CẦU BÀI VIẾT:
- Viết TỐI THIỂU 1800 từ (bắt buộc)
- Dùng HTML thuần: <h2>, <h3>, <p>, <ul>, <li>, <ol>, <strong>, <em>, <blockquote>, <img>
- Không dùng markdown, không emoji
- Mỗi H2 có ít nhất 3–4 đoạn <p> dài (4–6 câu/đoạn), phân tích chuyên sâu, ví dụ cụ thể
- Bắt buộc xen kẽ định dạng:
  + <ul>/<ol>: liệt kê lợi ích, bước thực hiện, lưu ý (ít nhất 3 danh sách)
  + <blockquote>: nhận định chuyên gia hoặc insight nổi bật (ít nhất 2 blockquote)
  + <h3>: mỗi H2 nên có 1–2 H3 phụ để tạo cấu trúc chi tiết
  + <strong>: nhấn mạnh điểm cốt lõi, <em>: thuật ngữ chuyên ngành
  + <img>: chèn ít nhất 1 thẻ img placeholder: <img src="placeholder.jpg" alt="${kw}" title="${kw}"> — đặt sau đoạn giới thiệu đầu tiên

- OUTBOUND LINKS (bắt buộc — giúp Google tin trang): chèn ít nhất 2 liên kết ngoài đến nguồn uy tín liên quan (Wikipedia tiếng Việt, báo lớn, hoặc tổ chức có liên quan). Dùng: <a href="URL" rel="nofollow" target="_blank">anchor text</a>

- FAQ SECTION (bắt buộc — tối ưu featured snippet & People Also Ask):
  Thêm 1 mục H2 cuối cùng có tiêu đề "Câu Hỏi Thường Gặp Về ${kw}" hoặc tương đương, chứa 4–5 cặp <h3> câu hỏi + <p> trả lời ngắn gọn (2–3 câu). Câu hỏi phải tự nhiên như người dùng thực sự tìm kiếm.

- Viết CHUYÊN SÂU như người có kinh nghiệm thực tế: dẫn chứng cụ thể, số liệu hợp lý, tình huống thực tế
- EEAT: thể hiện rõ kinh nghiệm, chuyên môn, uy tín trong từng đoạn — tránh viết chung chung
- Kết luận: tóm tắt giá trị cốt lõi + CTA rõ ràng thúc đẩy hành động

Chỉ trả về HTML content thuần, không thêm gì khác.`;
}

// ── English Prompt ────────────────────────────────────────────────────────
function buildArticlePromptEnglish(topic, kw) {
  // Extract aspect from topic (part after —)
  const aspectRaw = (topic.split(/\s*[—–-]\s*/)[1] || '').trim().toLowerCase();

  // Simple aspect matching for English
  const aspectStructureMap = [
    {
      keys: ['overview', 'introduction', 'comprehensive', 'complete', 'guide', 'everything'],  
      style: 'overview',
      h2Variants: [
        [`What is ${kw} — Definition and Overview`, `Key Features and Benefits`, `Who Should Use ${kw}`, `How ${kw} Works`, `Advantages and Limitations`, `Getting Started with ${kw}`, `Conclusion and Recommendations`],
        [`Understanding ${kw} — Complete Guide`, `Core Components Explained`, `Target Audience and Use Cases`, `${kw} vs Traditional Alternatives`, `Pros and Cons Analysis`, `Implementation Overview`, `Final Thoughts and Next Steps`],
      ],
    },
    {
      keys: ['how to', 'tutorial', 'guide', 'step', 'instructions'],  
      style: 'guide',
      h2Variants: [
        [`Prerequisites for ${kw}`, `Step 1 — Account Setup`, `Step 2 — Initial Configuration`, `Step 3 — First Execution`, `Step 4 — Verification and Testing`, `Common Issues and Solutions`, `Best Practices and Tips`],
        [`Getting Ready with ${kw}`, `Registration Process Walkthrough`, `Essential Settings Configuration`, `Your First ${kw} Experience`, `Troubleshooting Guide`, `Advanced Tips for Success`, `Frequently Asked Questions`],
      ],
    },
    {
      keys: ['review', 'experience', 'opinion', 'assessment', 'evaluation'],  
      style: 'review',
      h2Variants: [
        [`First Impressions of ${kw}`, `User Interface and Experience`, `Performance and Reliability`, `What I Liked About ${kw}`, `Areas for Improvement`, `Comparison with Competitors`, `Final Verdict and Rating`],
        [`Real-World Testing of ${kw}`, `Key Features in Action`, `Strengths Worth Highlighting`, `Weaknesses to Consider`, `User Feedback and Community`, `Value for Money Analysis`, `Should You Choose ${kw}?`],
      ],
    },
  ];

  const matched = aspectStructureMap.find(m =>
    m.keys.some(k => aspectRaw.includes(k))
  );

  const pickVariant = (variants) => variants[Math.floor(Math.random() * variants.length)];

  const fallbackVariants = [
    [`Introduction to ${kw}`, `Key Features and Capabilities`, `Benefits for Users`, `How to Get Started`, `Common Questions Answered`, `Expert Tips and Tricks`, `Conclusion`],
    [`What You Need to Know About ${kw}`, `Understanding the Basics`, `Practical Applications`, `Getting Started Guide`, `Potential Challenges`, `Success Strategies`, `Final Recommendations`],
  ];
  const fallbackH2s = pickVariant(fallbackVariants);

  const structureH2s = matched ? pickVariant(matched.h2Variants) : fallbackH2s;
  const structureNote = matched
    ? `ARTICLE TYPE: "${matched.style.toUpperCase()}" — structure and content must align with this perspective.`
    : `GENERAL ARTICLE — ensure each H2 offers a unique angle without repetition.`;

  const lsiVariants = [kw, `${kw} trusted`, `${kw} reliable`, `${kw} platform`, `${kw} service`, `${kw} solution`];

  return `⛔ ABSOLUTE REQUIREMENT — HIGHEST PRIORITY ⛔
YOU MUST WRITE THIS ENTIRE ARTICLE IN ENGLISH.
Even if the topic contains Vietnamese words or phrases, YOU MUST WRITE IN ENGLISH ONLY.
Every single word, sentence, heading, and paragraph MUST be in English.
Do NOT write any Vietnamese text. Do NOT mix languages.

⛔ CRITICAL RULE: NEVER write any 4-digit year (2020, 2021, 2022, 2023, 2024, 2025, 2026, or any other year). This is absolutely forbidden. You MAY use months (March, Q1, etc.).

You are an SEO expert with 10+ years of experience. Write a comprehensive, EEAT-compliant article ENTIRELY IN ENGLISH about: "${topic}".

⚠️ LANGUAGE REMINDER: If the topic "${topic}" contains Vietnamese text, interpret its meaning and write about it IN ENGLISH. The article content must be 100% English.

Focus Keyword: "${kw}"
LSI Keywords (use naturally throughout): ${lsiVariants.join(' | ')}

${structureNote}

REQUIRED STRUCTURE — Use these H2 headings (adjust wording for naturalness, but keep all 7 sections with correct angles):
${structureH2s.map((h, i) => `${i + 1}. ${h}`).join('\n')}

H2 NOTE: Include "${kw}" in at least 2–3 H2 headings. Use LSI variants or pronouns in others.

⚠️ KEYWORD DENSITY RULES — TOP PRIORITY:
Focus Keyword "${kw}" must appear: 20–35 times (density ~2.0–2.5%).
- Minimum required: 20 times. Below 20 → article rejected.
- Maximum allowed: 40 times. Don't exceed 2.5%.

KEYWORD "${kw}" DISTRIBUTION:
1. FIRST 100 WORDS: must contain "${kw}" at least 2 times (critical on-page signal).
2. H2 HEADINGS: at least 2–3 H2s must include "${kw}" directly.
3. BODY: distribute "${kw}" every ~120–150 words — roughly 1 occurrence per 2–3 consecutive <p> paragraphs.
4. DON'T stuff keywords — use LSI variants: ${lsiVariants.slice(1).join(', ')}.
5. DON'T start sentences with bare keyword. Correct: "Many users choose ${kw} because..." / "When using ${kw}..."
6. NEVER mention 4-digit years anywhere.

🔢 SELF-CHECK: Count "${kw}" occurrences before submitting. If < 20 → add more naturally.

ARTICLE REQUIREMENTS:
- MINIMUM 1800 words (required)
- Pure HTML only: <h2>, <h3>, <p>, <ul>, <li>, <ol>, <strong>, <em>, <blockquote>, <img>
- No markdown, no emoji
- Each H2: at least 3–4 long <p> paragraphs (4–6 sentences each), in-depth analysis, specific examples
- Required formatting mix:
  + <ul>/<ol>: lists of benefits, steps, notes (at least 3 lists)
  + <blockquote>: expert quotes or key insights (at least 2)
  + <h3>: 1–2 supporting H3s per H2 for detailed structure
  + <strong>: emphasize key points, <em>: technical terms
  + <img>: at least 1 placeholder: <img src="placeholder.jpg" alt="${kw}" title="${kw}"> — place after intro paragraph

- OUTBOUND LINKS (required for trust signals): insert at least 2 external links to reputable sources (Wikipedia, major publications, relevant organizations). Format: <a href="URL" rel="nofollow" target="_blank">anchor text</a>

- FAQ SECTION (required for featured snippets): Add final H2 titled "Frequently Asked Questions About ${kw}" or similar, with 4–5 pairs of <h3> question + <p> answer (2–3 sentences). Questions must sound natural like real user queries.

- Write with DEPTH and AUTHORITY: specific evidence, reasonable data, real scenarios
- EEAT: demonstrate clear experience, expertise, authority in every paragraph — avoid generic content
- Conclusion: summarize core value + clear CTA

Return only pure HTML content, nothing else.`;
}

// Step 2 — extract title + meta + slug từ content đã có
export function buildExtractPrompt(topic, content, keyword = '', language = 'vi') {
  const kw = (keyword || topic.split(/\s*[—–-]\s*/)[0]).trim();
  
  if (language === 'en') {
    return buildExtractPromptEnglish(topic, content, kw);
  } else {
    return buildExtractPromptVietnamese(topic, content, kw);
  }
}

// ── Vietnamese Extract Prompt ────────────────────────────────────────────────
function buildExtractPromptVietnamese(topic, content, kw) {

  // Chọn ngẫu nhiên một số không phải 7 để dùng trong tiêu đề có số
  const listNums = [3, 4, 5, 6, 8, 9, 10, 11, 12];
  const rn = () => listNums[Math.floor(Math.random() * listNums.length)];

  // Danh sách 20 format tiêu đề đa dạng — chọn NGẪU NHIÊN 1 cái, bắt buộc AI dùng đúng cái đó
  const titleFormatPool = [
    { label: 'câu hỏi tại sao',       template: `Tại Sao ${kw} Được Tin Dùng Rộng Rãi Đến Vậy?` },
    { label: 'câu hỏi có nên',         template: `${kw} Có Thực Sự Đáng Thử? Câu Trả Lời Thật` },
    { label: 'trải nghiệm thực tế',    template: `Trải Nghiệm Thực Tế Với ${kw}: Không Tô Vẽ` },
    { label: 'cảnh báo đừng bỏ qua',  template: `Đừng Dùng ${kw} Khi Chưa Đọc Bài Phân Tích Này` },
    { label: 'giải mã sự thật',        template: `Giải Mã ${kw}: Những Điều Ít Ai Chịu Chia Sẻ` },
    { label: 'so sánh trực diện',      template: `${kw} So Với Đối Thủ: Ai Thực Sự Vượt Trội Hơn?` },
    { label: 'hướng dẫn từ đầu',       template: `Hướng Dẫn Dùng ${kw} Đúng Cách Từ Đầu Đến Cuối` },
    { label: 'đánh giá thẳng thắn',    template: `${kw} Thực Ra Như Thế Nào: Đánh Giá Trung Thực` },
    { label: 'kinh nghiệm thực chiến', template: `Kinh Nghiệm Dùng ${kw} Sau Thời Gian Dài Thực Chiến` },
    { label: 'góc nhìn người trong cuộc', template: `${kw} Qua Góc Nhìn Của Người Đã Thực Sự Dùng` },
    { label: 'sự thật chưa ai nói',    template: `Sự Thật Về ${kw} Mà Phần Lớn Bài Viết Bỏ Qua` },
    { label: 'cẩm nang toàn diện',     template: `Cẩm Nang Toàn Diện Về ${kw} Cho Người Mới Bắt Đầu` },
    { label: 'điểm mạnh và yếu',       template: `${kw}: Điểm Mạnh Đáng Khen Và Điểm Yếu Phải Biết` },
    { label: 'sai lầm phổ biến',       template: `${rn()} Sai Lầm Phổ Biến Khi Dùng ${kw} Và Cách Tránh` },
    { label: 'điều cần biết trước',    template: `${rn()} Điều Cần Biết Trước Khi Bắt Đầu Với ${kw}` },
    { label: 'review sau thời gian dài', template: `Review ${kw} Sau Thời Gian Dài: Kết Quả Thực Tế` },
    { label: 'có đáng không',          template: `${kw} Có Đáng Để Bạn Bỏ Thời Gian Tìm Hiểu Không?` },
    { label: 'nhìn thẳng vào mặt tối', template: `Mặt Tối Của ${kw} Mà Quảng Cáo Không Nói Đến` },
    { label: 'ai nên và không nên',    template: `${kw}: Ai Nên Dùng Và Ai Tuyệt Đối Không Nên` },
    { label: 'phân tích chuyên sâu',   template: `Phân Tích Chuyên Sâu ${kw}: Có Xứng Đáng Với Kỳ Vọng?` },
  ];

  const chosenFormat = titleFormatPool[Math.floor(Math.random() * titleFormatPool.length)];

  // Power words tiếng Việt — chọn ngẫu nhiên 1 nhóm để tránh lặp tiêu đề
  const powerWordGroups = [
    'Toàn Diện, Chuyên Sâu, Hiệu Quả, Thực Tế, Đỉnh Cao, Cẩm Nang, Kinh Nghiệm, Đáng Tin Cậy',
    'Vượt Trội, Tuyệt Vời, Nổi Bật, Uy Tín, Xuất Sắc, Hàng Đầu, Đột Phá, Tối Ưu',
    'Chi Tiết, Thực Chiến, Chính Xác, Dễ Hiểu, An Toàn, Đơn Giản, Minh Bạch, Rõ Ràng',
    'Khám Phá, Tiết Lộ, Giải Mã, Phân Tích, Đánh Giá, So Sánh, Tổng Hợp, Trung Thực',
  ];
  const powerWords = powerWordGroups[Math.floor(Math.random() * powerWordGroups.length)];

  return `Dựa trên bài viết HTML bên dưới về chủ đề "${topic}" với focus keyword là "${kw}", hãy tạo:

1. title: Tiêu đề SEO (50-65 ký tự)
   - Bắt đầu bằng Focus Keyword "${kw}" hoặc đặt keyword ở đầu tiêu đề (2-3 từ đầu tiên)
   - Chứa 1 Power Word (chọn trong: ${powerWords})
   - TUYỆT ĐỐI KHÔNG dùng năm 4 chữ số (2020, 2021, 2022, 2023, 2024, 2025, 2026...)
   - BẮT BUỘC dùng format sau — KHÔNG được đổi sang format khác:
     FORMAT: ${chosenFormat.label.toUpperCase()}
     Ví dụ mẫu: "${chosenFormat.template}"
     Hãy viết tiêu đề theo đúng cấu trúc và tinh thần của ví dụ mẫu trên (thay nội dung cho phù hợp bài viết, KHÔNG copy y chang).

2. meta_description: Mô tả (140-160 ký tự, tối đa 160)
   - 10 ký tự ĐẦU TIÊN PHẢI chứa "${kw}" (bắt buộc tuyệt đối)
   - Kêu gọi click, nêu lợi ích rõ ràng
   - TUYỆT ĐỐI không quá 160 ký tự

3. slug: Đường dẫn URL ngắn (TỐI ĐA 50 ký tự)
   - Chỉ dùng tiếng Anh (transliterate nếu cần), viết thường, dấu gạch nối
   - 2-5 từ, tối đa 50 ký tự bao gồm cả dấu gạch nối
   - Ví dụ đúng: "kjc-review-toan-dien" (20 ký tự), "huong-dan-789bet" (15 ký tự)
   - Ví dụ SAI: quá ngắn như "kjc" hoặc quá dài quá 50 ký tự

Trả về JSON hợp lệ:
{"title": "...", "meta_description": "...", "slug": "..."}

Bài viết:
${content.slice(0, 2000)}`;
}

// ── English Extract Prompt ────────────────────────────────────────────────────
function buildExtractPromptEnglish(topic, content, kw) {
  // Pick random number to use in title formats (avoid 7)
  const listNums = [3, 4, 5, 6, 8, 9, 10, 11, 12];
  const rn = () => listNums[Math.floor(Math.random() * listNums.length)];

  // 20 diverse title formats — randomly pick ONE, AI must follow that exact format
  const titleFormatPool = [
    { label: 'why question',       template: `Why ${kw} is Widely Trusted and Recommended` },
    { label: 'should you question',  template: `Is ${kw} Really Worth It? Honest Answer` },
    { label: 'real experience',    template: `Real Experience with ${kw}: Unfiltered Review` },
    { label: 'warning alert',      template: `Don't Use ${kw} Before Reading This Analysis` },
    { label: 'truth revealed',     template: `Uncovering ${kw}: What Few People Share` },
    { label: 'direct comparison',  template: `${kw} vs Competitors: Who Really Wins?` },
    { label: 'complete guide',     template: `How to Use ${kw} Correctly: Complete Guide` },
    { label: 'honest assessment',  template: `What ${kw} is Really Like: Honest Review` },
    { label: 'real-world testing', template: `Using ${kw} Long-Term: Real Results` },
    { label: 'insider view',       template: `${kw} from an Actual User's Perspective` },
    { label: 'hidden truth',       template: `Truth About ${kw} Most Articles Skip` },
    { label: 'comprehensive handbook', template: `Complete ${kw} Handbook for Beginners` },
    { label: 'pros and cons',      template: `${kw}: Strengths to Praise and Weaknesses to Know` },
    { label: 'common mistakes',    template: `${rn()} Common ${kw} Mistakes and How to Avoid Them` },
    { label: 'things to know',     template: `${rn()} Things to Know Before Starting with ${kw}` },
    { label: 'long term review',   template: `${kw} Review After Extended Use: Real Results` },
    { label: 'worth it question',  template: `Is ${kw} Worth Your Time? The Real Answer` },
    { label: 'dark side',          template: `The Dark Side of ${kw} Ads Don't Tell You` },
    { label: 'who should use',     template: `${kw}: Who Should and Absolutely Shouldn't Use It` },
    { label: 'in depth analysis',  template: `In-Depth ${kw} Analysis: Does it Meet Expectations?` },
  ];

  const chosenFormat = titleFormatPool[Math.floor(Math.random() * titleFormatPool.length)];

  // Power words in English — pick random group to avoid title repetition
  const powerWordGroups = [
    'Comprehensive, In-Depth, Effective, Practical, Ultimate, Handbook, Expert, Trusted',
    'Superior, Excellent, Outstanding, Reputable, Exceptional, Leading, Breakthrough, Optimal',
    'Detailed, Hands-On, Accurate, Clear, Safe, Simple, Transparent, Straightforward',
    'Discover, Reveal, Uncover, Analyze, Evaluate, Compare, Review, Honest',
  ];
  const powerWords = powerWordGroups[Math.floor(Math.random() * powerWordGroups.length)];

  return `Based on the HTML article below about "${topic}" with focus keyword "${kw}", create:

1. title: SEO Title (50-65 characters)
   - Start with Focus Keyword "${kw}" or place keyword at the beginning (first 2-3 words)
   - Include 1 Power Word (choose from: ${powerWords})
   - ABSOLUTELY NO 4-digit years (2020, 2021, 2022, 2023, 2024, 2025, 2026...)
   - REQUIRED format — DO NOT change to different format:
     FORMAT: ${chosenFormat.label.toUpperCase()}
     Example template: "${chosenFormat.template}"
     Write the title following the exact structure and spirit of this example (adapt content to fit article, DON'T copy exactly).

2. meta_description: Meta Description (140-160 characters, max 160)
   - FIRST 10 CHARACTERS MUST contain "${kw}" (absolutely required)
   - Call-to-action, state clear benefits
   - MUST NOT exceed 160 characters

3. slug: Short URL path (MAX 50 characters)
   - English only (transliterate if needed), lowercase, hyphens
   - 2-5 words, max 50 characters including hyphens
   - Correct examples: "kjc-review-complete" (19 chars), "guide-789bet" (12 chars)
   - WRONG: too short like "kjc" or over 50 characters

Return valid JSON:
{"title": "...", "meta_description": "...", "slug": "..."}

Article content:
${content.slice(0, 2000)}`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function stripEmojisAndUrls(text) {
  // Strip emoji
  const noEmoji = text.replace(
    /[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F1E0}-\u{1F1FF}]/gu,
    ''
  );
  // Strip URLs
  const noUrl = noEmoji.replace(/https?:\/\/[^\s"'<>]+/gi, '');
  return noUrl;
}

function countWords(html) {
  // Strip HTML tags, count words
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.split(' ').filter(Boolean).length;
}

/**
 * Post-processing: đếm keyword trong HTML, nếu thiếu thì append vào cuối các <p>/<li> chưa có.
 * Không dùng regex phức tạp có thể silent-fail — chỉ replace </p> hoặc </li> trực tiếp.
 */
function boostKeywordDensity(html, kw, targetMin = 25) {
  if (!kw) return html;
  const kwLower = kw.toLowerCase();
  const kwEsc = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const kwRegex = new RegExp(kwEsc, 'gi');
  const count = (h) => (h.match(kwRegex) || []).length;

  let current = count(html);
  if (current >= targetMin) {
    console.log(`[density] "${kw}" = ${current} lần — đủ, skip boost.`);
    return html;
  }

  let needed = targetMin - current;
  console.log(`[density] "${kw}" = ${current} lần — thiếu ${needed}, bắt đầu inject...`);

  // Các câu tự nhiên append vào cuối đoạn
  const appendPhrases = [
    (k) => ` Nhiều người dùng <strong>${k}</strong> đánh giá đây là điểm nổi bật nhất.`,
    (k) => ` Đây chính là lý do ${k} luôn được ưu tiên lựa chọn.`,
    (k) => ` Khi trải nghiệm ${k}, người dùng thường nhận ra sự khác biệt rõ rệt.`,
    (k) => ` Với ${k}, quá trình này trở nên đơn giản và hiệu quả hơn nhiều.`,
    (k) => ` ${k} thực sự mang lại giá trị thiết thực mà ít nền tảng nào sánh được.`,
    (k) => ` Người dùng ${k} thường chia sẻ phản hồi tích cực sau thời gian sử dụng.`,
    (k) => ` Đó là lý do ${k} luôn nằm trong danh sách được đề xuất hàng đầu.`,
    (k) => ` Bằng cách tận dụng ${k}, người dùng có thể tối ưu kết quả đáng kể.`,
  ];

  // Các cụm tự nhiên chèn vào đầu đoạn (thay thế opening tag)
  const prependPhrases = [
    (k) => `${k} nổi bật ở chỗ `,
    (k) => `Khi sử dụng ${k}, điều đầu tiên cần lưu ý là `,
    (k) => `Với ${k}, `,
    (k) => `Người dùng ${k} thường biết rằng `,
  ];

  let injected = 0;
  let phraseIdx = 0;

  // Bước 1: inject vào các <p> chưa có keyword
  let result = html.replace(/<p(\b[^>]*)?>([\s\S]*?)<\/p>/gi, (full, attrs = '', inner) => {
    if (injected >= needed) return full;
    const text = inner.replace(/<[^>]+>/g, '').trim();
    if (text.toLowerCase().includes(kwLower)) return full;  // đã có rồi
    if (text.split(/\s+/).length < 18) return full;         // quá ngắn

    injected++;
    // Xen kẽ: chẵn → append, lẻ → prepend
    if (phraseIdx % 2 === 0) {
      const phrase = appendPhrases[(phraseIdx / 2) % appendPhrases.length](kw);
      phraseIdx++;
      return `<p${attrs}>${inner}${phrase}</p>`;
    } else {
      const phrase = prependPhrases[Math.floor(phraseIdx / 2) % prependPhrases.length](kw);
      phraseIdx++;
      // Chỉ prepend nếu inner bắt đầu bằng text (không bắt đầu bằng tag)
      const trimmed = inner.trimStart();
      if (trimmed.startsWith('<')) {
        // inner bắt đầu bằng tag → append thay vì prepend
        const ap = appendPhrases[phraseIdx % appendPhrases.length](kw);
        return `<p${attrs}>${inner}${ap}</p>`;
      }
      // Viết hoa chữ cái đầu của phrase, lowercase chữ đầu câu gốc
      const restInner = trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
      return `<p${attrs}>${phrase}${restInner}</p>`;
    }
  });

  // Bước 2: nếu vẫn còn thiếu → inject vào <li> chưa có keyword
  if (injected < needed) {
    const stillNeeded = needed - injected;
    let liInjected = 0;
    result = result.replace(/<li(\b[^>]*)?>([\s\S]*?)<\/li>/gi, (full, attrs = '', inner) => {
      if (liInjected >= stillNeeded) return full;
      const text = inner.replace(/<[^>]+>/g, '').trim();
      if (text.toLowerCase().includes(kwLower)) return full;
      if (text.split(/\s+/).length < 5) return full;
      liInjected++;
      return `<li${attrs}>${inner} — phù hợp với người dùng <strong>${kw}</strong></li>`;
    });
    injected += liInjected;
  }

  const after = count(result);
  console.log(`[density] Sau boost: "${kw}" = ${after} lần (injected ${injected}).`);
  return result;
}

function parseArticleJson(raw) {
  // Tìm JSON block dù có text thừa trước/sau
  const match = raw.match(/\{[\s\S]*"title"[\s\S]*"content"[\s\S]*"meta_description"[\s\S]*\}/);
  if (!match) throw new Error('Response không phải JSON hợp lệ');
  const parsed = JSON.parse(match[0]);
  if (!parsed.title || !parsed.content || !parsed.meta_description) {
    throw new Error('JSON thiếu field title/content/meta_description');
  }
  return parsed;
}

// ── Core: generate 1 bài, retry nếu fail/dưới word count ────────────────────
// focusKeyword: nếu truyền vào sẽ dùng trực tiếp làm focus keyword thay vì tách từ topic
// language: 'vi' hoặc 'en'
export async function generateSingleArticle(topic, model = 'gpt-4o-mini', focusKeyword = '', language = 'vi') {
  const openai = getOpenAI();
  // Ưu tiên anchor do người dùng nhập; fallback: rút từ topic
  const keyword = focusKeyword.trim() || topic.split(/\s*[—–-]\s*/)[0].trim();
  let lastError = null;

  console.log(`[generator] topic="${topic}" | keyword="${keyword}" | language="${language}" | model="${model}"`);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Step 1: generate full article content
      const messages = [{ role: 'user', content: buildArticlePrompt(topic, keyword, language) }];
      const contentResp = await openai.chat.completions.create({
        model,
        messages,
        max_tokens: 8000,
        temperature: 0.8,
      });

      const choice = contentResp.choices[0];
      let htmlContent = choice?.message?.content?.trim() || '';
      const finishReason = choice?.finish_reason;
      console.log(`[generator] "${topic}" attempt ${attempt}: finish_reason=${finishReason}, tokens=${contentResp.usage?.completion_tokens}`);

      htmlContent = stripEmojisAndUrls(htmlContent);
      // Bỏ markdown code fences nếu model bọc trong ```html
      htmlContent = htmlContent.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');

      // Nếu bị cắt giữa chừng (finish_reason=length), tiếp tục trong cùng conversation
      if (finishReason === 'length') {
        messages.push({ role: 'assistant', content: htmlContent });
        messages.push({ role: 'user', content: 'Tiếp tục viết phần còn lại của bài (chỉ phần chưa viết, không lặp lại).' });
        const contResp = await openai.chat.completions.create({
          model,
          messages,
          max_tokens: 4000,
          temperature: 0.8,
        });
        htmlContent += '\n' + (contResp.choices[0]?.message?.content?.trim() || '');
        htmlContent = stripEmojisAndUrls(htmlContent);
      }

      let wordCount = countWords(htmlContent);

      // Nếu vẫn thiếu từ → yêu cầu mở rộng
      if (wordCount < MIN_WORD_COUNT) {
        const needed = MIN_WORD_COUNT - wordCount + 300;
        console.log(`[generator] "${topic}" expand: ${wordCount} từ, cần thêm ~${needed} từ`);
        
        const expandPrompt = language === 'en'
          ? `The article above only has ${wordCount} words, not enough. Please EXPAND it by at least ${needed} words by:\n- Adding 2-3 new H2 sections with detailed content\n- Expanding existing paragraphs\nReturn the COMPLETE full HTML article (including old + new parts).`
          : `Bài viết trên chỉ có ${wordCount} từ, chưa đủ. Hãy MỞ RỘNG thêm ít nhất ${needed} từ bằng cách:\n- Thêm 2-3 section H2 mới với nội dung chi tiết\n- Mở rộng các đoạn hiện có\nTrả về TOÀN BỘ bài viết HTML đầy đủ (bao gồm cả phần cũ + phần mới).`;
        
        const expandResp = await openai.chat.completions.create({
          model,
          messages: [
            { role: 'user', content: buildArticlePrompt(topic, keyword, language) },
            { role: 'assistant', content: htmlContent },
            { role: 'user', content: expandPrompt },
          ],
          max_tokens: 8000,
          temperature: 0.8,
        });
        const expanded = expandResp.choices[0]?.message?.content?.trim() || '';
        const expandedClean = stripEmojisAndUrls(
          expanded.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')
        );
        if (countWords(expandedClean) > wordCount) {
          htmlContent = expandedClean;
          wordCount = countWords(htmlContent);
        }
      }

      if (wordCount < MIN_WORD_COUNT) {
        lastError = new Error(`Word count ${wordCount} < ${MIN_WORD_COUNT} (attempt ${attempt}/${MAX_RETRIES})`);
        console.warn(`[generator] Topic "${topic}" attempt ${attempt}: ${lastError.message}`);
        await new Promise((r) => setTimeout(r, attempt * 1500));
        continue;
      }

      // Post-processing: boost keyword density nếu AI không đủ
      htmlContent = boostKeywordDensity(htmlContent, keyword, 25);

      // Step 2: extract title + meta_description + slug
      const metaResp = await openai.chat.completions.create({
        model,
        messages: [{ role: 'user', content: buildExtractPrompt(topic, htmlContent, keyword, language) }],
        max_tokens: 400,
        temperature: 0.5,
        response_format: { type: 'json_object' },
      });
      const metaRaw = metaResp.choices[0]?.message?.content || '{}';
      let meta = {};
      try { meta = JSON.parse(metaRaw); } catch { meta = {}; }

      // Xóa năm (4 chữ số 19xx/20xx) ra khỏi toàn bộ HTML content và title
      htmlContent = htmlContent.replace(/\b(19|20)\d{2}\b/g, '');

      // Xóa năm (4 chữ số 19xx/20xx) ra khỏi title đề phòng AI vẫn thêm vào
      const rawTitle = stripEmojisAndUrls(meta.title || topic);
      const cleanTitle = rawTitle.replace(/\b(19|20)\d{2}\b/g, '').replace(/\s{2,}/g, ' ').replace(/[:\-–—,]+\s*$/, '').trim();
      // Đảm bảo meta_description không quá 160 ký tự
      const rawMeta = (meta.meta_description || '').trim();
      const cleanMeta = rawMeta.length > 160 ? rawMeta.slice(0, 157).replace(/\s+\S*$/, '') + '...' : rawMeta;
      // Đảm bảo slug không quá 50 ký tự
      const rawSlug = (meta.slug || '').trim().toLowerCase().replace(/[^a-z0-9\-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      const cleanSlug = rawSlug.length > 50 ? rawSlug.slice(0, 50).replace(/-[^-]*$/, '') : rawSlug;
      const article = {
        content: htmlContent,
        title: cleanTitle,
        meta_description: cleanMeta,
      };

      return {
        topic,
        keyword,
        title: article.title,
        content: article.content,
        meta_description: article.meta_description,
        slug: cleanSlug || '',
        wordCount,
        model,
        generatedAt: new Date().toISOString(),
        status: 'ready',
      };
    } catch (err) {
      lastError = err;
      console.warn(`[generator] Topic "${topic}" attempt ${attempt} error:`, err.message);
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, attempt * 1500));
      }
    }
  }

  // Tất cả retry đều fail
  return {
    topic,
    keyword,
    title: '',
    content: '',
    meta_description: '',
    slug: '',
    wordCount: 0,
    model,
    generatedAt: new Date().toISOString(),
    status: 'failed',
    error: lastError?.message || 'Unknown error',
  };
}

// ── Bulk sync: chạy N topics với concurrency limiter ─────────────────────────
// keywords: mảng focus keyword tương ứng với từng topic (optional)
export async function generateBulkSync(topics, model, onProgress, keywords = [], language = 'vi') {
  const results = await Promise.allSettled(
    topics.map((topic, idx) =>
      limiter.schedule(async () => {
        const result = await generateSingleArticle(topic, model, keywords[idx] || '', language);
        onProgress?.(idx, topics.length, result);
        return result;
      })
    )
  );

  return results.map((r) =>
    r.status === 'fulfilled' ? r.value : { topic: '', status: 'failed', error: r.reason?.message }
  );
}

// ── Batch API helpers ─────────────────────────────────────────────────────────
export async function createBatch(topics, model = 'gpt-4o-mini') {
  const openai = getOpenAI();

  // Build .jsonl content
  const lines = topics.map((topic) =>
    JSON.stringify({
      custom_id: topic,
      method: 'POST',
      url: '/v1/chat/completions',
      body: {
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildPrompt(topic) },
        ],
        max_tokens: 8000,
        response_format: { type: 'json_object' },
      },
    })
  );
  const jsonlContent = lines.join('\n');

  // Upload file
  const { Readable } = await import('stream');
  const stream = Readable.from([jsonlContent]);
  stream.name = 'batch_input.jsonl'; // OpenAI SDK needs .name

  const file = await openai.files.create({
    file: new File([jsonlContent], 'batch_input.jsonl', { type: 'application/jsonl' }),
    purpose: 'batch',
  });

  // Create batch
  const batch = await openai.batches.create({
    input_file_id: file.id,
    endpoint: '/v1/chat/completions',
    completion_window: '24h',
  });

  return { batchId: batch.id, fileId: file.id, topicCount: topics.length };
}

export async function getBatchStatus(batchId) {
  const openai = getOpenAI();
  const batch = await openai.batches.retrieve(batchId);

  const info = {
    batchId,
    status: batch.status, // validating | in_progress | completed | failed | expired | cancelling | cancelled
    requestCounts: batch.request_counts,
    outputFileId: batch.output_file_id || null,
  };

  if (batch.status === 'completed' && batch.output_file_id) {
    // Tải kết quả
    const content = await openai.files.content(batch.output_file_id);
    const text = await content.text();
    const articles = [];

    for (const line of text.split('\n').filter(Boolean)) {
      try {
        const item = JSON.parse(line);
        const topic = item.custom_id;
        const raw = item.response?.body?.choices?.[0]?.message?.content || '';
        try {
          const article = parseArticleJson(raw);
          article.content = stripEmojisAndUrls(article.content);
          article.title = stripEmojisAndUrls(article.title);
          const wordCount = countWords(article.content);
          articles.push({
            topic,
            ...article,
            wordCount,
            status: wordCount >= MIN_WORD_COUNT ? 'ready' : 'short',
            generatedAt: new Date().toISOString(),
          });
        } catch {
          articles.push({ topic, status: 'failed', error: 'Parse error' });
        }
      } catch {}
    }

    info.articles = articles;
  }

  return info;
}
