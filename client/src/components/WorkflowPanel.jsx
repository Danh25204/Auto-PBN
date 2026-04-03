import { useState, useEffect, useRef, useMemo } from 'react';
import { processContent, extractDomainKey, domainKeywords, extractKeywordSentence } from '../utils/content.js';

// 500 góc độ bài viết cho ngành nhà cái/cá cược - Chỉ nội dung tích cực
const ASPECTS = [
  // ═══ GIỚI THIỆU & TỔNG QUAN (50) ═══
  'giới thiệu tổng quan và đánh giá chi tiết',
  'những điều cần biết trước khi tham gia',
  'cẩm nang toàn diện cho người mới',
  'tìm hiểu từ A đến Z cho người mới bắt đầu',
  'khái quát đầy đủ về dịch vụ cá cược',
  'điểm qua các tính năng nổi bật',
  'lý do được nhiều người tin tưởng lựa chọn',
  'vì sao đang trở thành xu hướng',
  'phân tích sâu về chất lượng dịch vụ',
  'đánh giá toàn diện sau thử nghiệm thực tế',
  'những ưu điểm vượt trội so với thị trường',
  'giải mã sức hút từ cộng đồng người chơi',
  'tầm nhìn và sứ mệnh phát triển bền vững',
  'hành trình chinh phục thị trường cá cược',
  'đẳng cấp nhà cái hàng đầu châu Á',
  'sự khác biệt tạo nên thương hiệu uy tín',
  'cam kết chất lượng từ đội ngũ chuyên nghiệp',
  'nền tảng công nghệ hiện đại và bảo mật',
  'giấy phép hoạt động hợp pháp quốc tế',
  'đối tác chiến lược với các tổ chức lớn',
  'tổng quan về hệ sinh thái game phong phú',
  'điểm danh các sản phẩm cá cược đa dạng',
  'phân khúc thị trường và đối tượng người chơi',
  'lịch sử hình thành và phát triển',
  'các mốc son trong hành trình phát triển',
  'tầm ảnh hưởng trong cộng đồng cá cược',
  'giá trị cốt lõi và văn hóa doanh nghiệp',
  'cam kết trách nhiệm với người chơi',
  'chương trình phát triển cộng đồng',
  'đánh giá độ uy tín từ chuyên gia',
  'xếp hạng trong top nhà cái chất lượng',
  'giải thưởng và danh hiệu đã đạt được',
  'sự công nhận từ các tổ chức quốc tế',
  'đội ngũ sáng lập và ban lãnh đạo',
  'tầm nhìn chiến lược dài hạn',
  'kế hoạch mở rộng thị trường',
  'đầu tư công nghệ và đổi mới sáng tạo',
  'mô hình kinh doanh bền vững',
  'quan hệ đối tác chiến lược',
  'mạng lưới phân phối toàn cầu',
  'các thị trường hoạt động chính',
  'sự hiện diện trên nền tảng số',
  'chiến lược marketing sáng tạo',
  'hoạt động truyền thông và PR',
  'tương tác với cộng đồng người dùng',
  'chương trình trải nghiệm miễn phí',
  'demo game và hướng dẫn chi tiết',
  'thông tin liên hệ và hỗ trợ',
  'cổng thông tin chính thức',
  'ứng dụng di động chính hãng',

  // ═══ ĐĂNG KÝ & BẮT ĐẦU (40) ═══
  'hướng dẫn đăng ký tài khoản nhanh chóng',
  'các bước tạo tài khoản chi tiết từng bước',
  'quy trình đăng ký đơn giản chỉ 3 phút',
  'cách xác thực tài khoản an toàn',
  'hướng dẫn hoàn tất thông tin cá nhân',
  'mẹo đăng ký để nhận ưu đãi tối đa',
  'cách kích hoạt tài khoản thành công',
  'thiết lập bảo mật cho tài khoản mới',
  'hướng dẫn đăng nhập lần đầu',
  'cách cài đặt ứng dụng trên smartphone',
  'tải app chính thức cho iOS và Android',
  'hướng dẫn cài đặt trên máy tính',
  'cách truy cập trên mọi thiết bị',
  'thiết lập thông báo và cảnh báo',
  'tùy chỉnh giao diện theo sở thích',
  'cách nạp tiền lần đầu cho người mới',
  'các phương thức thanh toán được hỗ trợ',
  'hướng dẫn liên kết tài khoản ngân hàng',
  'cách nhận thưởng chào mừng',
  'kích hoạt các chương trình khuyến mãi',
  'bí quyết tối ưu hóa tài khoản mới',
  'checklist cho người mới bắt đầu',
  'những điều nên làm ngay sau đăng ký',
  'cách tham gia cộng đồng người chơi',
  'kết nối với đội ngũ hỗ trợ',
  'tìm hiểu giao diện và tính năng chính',
  'làm quen với các loại hình cá cược',
  'chọn sản phẩm phù hợp cho người mới',
  'cách đặt cược đơn giản đầu tiên',
  'tips chơi an toàn cho newbie',
  'tránh những sai lầm phổ biến',
  'cách quản lý ngân sách hiệu quả',
  'thiết lập giới hạn cá cược hợp lý',
  'tham gia khóa học hướng dẫn miễn phí',
  'xem video tutorial chi tiết',
  'đọc tài liệu hướng dẫn đầy đủ',
  'tham khảo FAQs cho người mới',
  'nhận tư vấn 1-1 từ chuyên viên',
  'cộng đồng hỗ trợ người chơi mới',
  'chương trình đồng hành cho starter',

  // ═══ ƯU ĐIỂM & TÍNH NĂNG (50) ═══
  'tính năng cá cược trực tiếp hấp dẫn',
  'giao diện thân thiện dễ sử dụng',
  'hệ thống thanh toán nhanh chóng',
  'tỷ lệ cược cạnh tranh hàng đầu',
  'độ bảo mật chuẩn quốc tế',
  'dịch vụ khách hàng 24/7 chuyên nghiệp',
  'kho game đa dạng với hàng ngàn lựa chọn',
  'live casino chất lượng cao',
  'cá cược thể thao phong phú',
  'slot game hiện đại với đồ họa đẹp mắt',
  'poker room sôi động',
  'bắn cá 3D đồ họa tuyệt đẹp',
  'xổ số trực tuyến minh bạch',
  'game bài truyền thống hấp dẫn',
  'esports với các giải đấu lớn',
  'tính năng cash out linh hoạt',
  'streaming trực tiếp chất lượng HD',
  'thống kê chi tiết giúp phân tích',
  'công cụ dự đoán thông minh',
  'lịch sử cá cược rõ ràng',
  'quản lý tài khoản dễ dàng',
  'ứng dụng mobile mượt mà',
  'giao dịch nhanh chóng an toàn',
  'đa dạng phương thức nạp rút',
  'không giới hạn số tiền rút',
  'xử lý giao dịch tự động',
  'mã hóa dữ liệu SSL 256-bit',
  'xác thực hai yếu tố (2FA)',
  'bảo vệ thông tin cá nhân',
  'chống gian lận hiệu quả',
  'hệ thống AI phát hiện bất thường',
  'sao lưu dữ liệu thường xuyên',
  'máy chủ ổn định không gián đoạn',
  'tốc độ tải trang nhanh',
  'tối ưu cho mọi thiết bị',
  'responsive design hoàn hảo',
  'đa ngôn ngữ hỗ trợ người chơi',
  'đa tiền tệ tiện lợi',
  'tích hợp ví điện tử phổ biến',
  'hỗ trợ cryptocurrency',
  'chương trình VIP đẳng cấp',
  'tích điểm đổi thưởng hấp dẫn',
  'cashback mỗi tuần',
  'hoàn trả không giới hạn',
  'bảo hiểm cược độc đáo',
  'combo cược siêu lợi nhuận',
  'tính năng tự động đặt cược',
  'copy cược từ cao thủ',
  'cộng đồng chia sẻ tip miễn phí',
  'blog kiến thức chuyên sâu',

  // ═══ KHUYẾN MÃI & ƯU ĐÃI (40) ═══
  'chương trình khuyến mãi chào mừng hấp dẫn',
  'bonus 100% cho thành viên mới',
  'quà tặng giá trị khi đăng ký',
  'freespin không giới hạn',
  'hoàn trả cược thua mỗi ngày',
  'cashback lên đến 20% hàng tuần',
  'thưởng nạp đầu siêu khủng',
  'khuyến mãi nạp lần 2, 3, 4',
  'ưu đãi đặc biệt ngày cuối tuần',
  'event thứ 2 vàng may mắn',
  'happy hour với tỷ lệ x2',
  'giải đấu slot với giải thưởng lớn',
  'tournament poker hàng tháng',
  'bảng xếp hạng với quà khủng',
  'combo thưởng liên hoàn',
  'tích điểm đổi quà hấp dẫn',
  'chương trình VIP đa cấp độ',
  'ưu đãi riêng cho thành viên VIP',
  'quà sinh nhật giá trị',
  'thưởng giới thiệu bạn bè không giới hạn',
  'hoa hồng đại lý hấp dẫn',
  'event đặc biệt các dịp lễ',
  'quà tặng tết độc quyền',
  'giải thưởng World Cup',
  'sự kiện mùa Euro',
  'khuyến mãi mùa giải Premier League',
  'ưu đãi Champions League',
  'thưởng cược thể thao combo',
  'bảo hiểm cược bóng đá',
  'tăng tỷ lệ cược đặc biệt',
  'cược miễn phí hàng ngày',
  'vòng quay may mắn',
  'minigame nhận thưởng',
  'check-in nhận quà mỗi ngày',
  'nhiệm vụ hàng ngày thú vị',
  'thử thách tuần với phần thưởng',
  'mã khuyến mãi độc quyền',
  'voucher giảm giá',
  'điểm thưởng tích lũy',
  'đổi điểm lấy tiền mặt',

  // ═══ TRẢI NGHIỆM & ĐÁNH GIÁ (40) ═══
  'trải nghiệm mượt mà không lag',
  'cảm nhận chất lượng dịch vụ tuyệt vời',
  'sự hài lòng của hàng triệu người chơi',
  'feedback tích cực từ cộng đồng',
  'đánh giá 5 sao từ người dùng',
  'những câu chuyện thành công thật',
  'chiến thắng ấn tượng của thành viên',
  'jackpot khủng được trao tặng',
  'giải thưởng lớn nhất từng chi trả',
  'người chơi may mắn hàng ngày',
  'cảm nhận về tốc độ nạp rút siêu nhanh',
  'ấn tượng về đội ngũ CSKH',
  'giải quyết vấn đề nhanh chóng',
  'tư vấn nhiệt tình chuyên nghiệp',
  'hỗ trợ 24/7 không giới hạn',
  'trải nghiệm live casino như thật',
  'dealer xinh đẹp chuyên nghiệp',
  'chất lượng stream không gián đoạn',
  'âm thanh sống động chân thực',
  'cảm giác như đang ở Las Vegas',
  'đồ họa game đỉnh cao',
  'hiệu ứng mượt mà bắt mắt',
  'gameplay cuốn hút không rời mắt',
  'tính năng social tương tác vui',
  'chat room sôi động',
  'kết bạn với người chơi toàn cầu',
  'cộng đồng văn minh lịch sự',
  'không khí fair play công bằng',
  'tỷ lệ thắng minh bạch rõ ràng',
  'RNG được kiểm định quốc tế',
  'kết quả công bằng không can thiệp',
  'thống kê minh bạch 100%',
  'lịch sử cược có thể kiểm tra',
  'xác minh công bằng provably fair',
  'audit độc lập định kỳ',
  'giấy chứng nhận uy tín',
  'niềm tin từ hàng triệu người chơi',
  'tỷ lệ giữ chân khách hàng cao',
  'người chơi quay lại nhiều lần',
  'mức độ trung thành đáng kinh ngạc',

  // ═══ NẠP RÚT TIỀN (30) ═══
  'hướng dẫn nạp tiền nhanh nhất',
  'các phương thức nạp tiền phổ biến',
  'nạp qua ngân hàng siêu tốc',
  'chuyển khoản tự động 24/7',
  'nạp qua ví điện tử Momo',
  'thanh toán qua Zalopay tiện lợi',
  'nạp bằng thẻ cào điện thoại',
  'chuyển khoản internet banking',
  'quét mã QR nạp tiền tức thì',
  'nạp crypto Bitcoin Ethereum',
  'hỗ trợ USDT và stablecoin',
  'không tính phí giao dịch nạp',
  'thời gian xử lý chỉ 1-3 phút',
  'hướng dẫn rút tiền chi tiết',
  'rút tiền nhanh chóng an toàn',
  'xử lý rút tiền trong 5 phút',
  'không giới hạn số lần rút',
  'hạn mức rút linh hoạt',
  'không phí rút tiền',
  'rút về tài khoản ngân hàng',
  'rút qua ví điện tử',
  'rút bằng crypto',
  'xác minh giao dịch nhanh',
  'bảo mật giao dịch tuyệt đối',
  'lịch sử giao dịch rõ ràng',
  'thông báo giao dịch realtime',
  'hỗ trợ nhiều loại tiền tệ',
  'tỷ giá hối đoái cạnh tranh',
  'giao dịch ổn định 24/7',
  'đội ngũ kiểm soát gian lận',

  // ═══ LIVE CASINO (30) ═══
  'live casino chân thực như thật',
  'baccarat trực tiếp với dealer xinh',
  'roulette live đỉnh cao',
  'blackjack với các bàn VIP',
  'sicbo xóc đĩa trực tuyến',
  'dragon tiger tốc độ nhanh',
  'poker live với cao thủ',
  'game show live hấp dẫn',
  'Dream Catcher may mắn',
  'Monopoly Live độc đáo',
  'Mega Ball siêu thú vị',
  'Lightning Roulette điện quang',
  'dealer chuyên nghiệp nhiệt tình',
  'tương tác trực tiếp với dealer',
  'nhiều bàn chơi cùng lúc',
  'giới hạn cược linh hoạt',
  'VIP table cho high roller',
  'phòng chơi riêng exclusive',
  'stream HD không giật lag',
  'góc quay đa chiều',
  'thống kê kết quả realtime',
  'lịch sử ván chơi đầy đủ',
  'chat với dealer và người chơi',
  'tips từ dealer chuyên nghiệp',
  'không gian casino sang trọng',
  'ánh sáng âm thanh chuyên nghiệp',
  'chơi mọi lúc mọi nơi',
  'mobile live casino mượt mà',
  'nhiều nhà cung cấp uy tín',
  'Evolution Gaming đỉnh cao',

  // ═══ THỂ THAO (30) ═══
  'cá cược bóng đá hàng đầu',
  'tỷ lệ kèo bóng đá cực tốt',
  'kèo châu Á chuyên sâu',
  'kèo tài xỉu phong phú',
  'cược trực tiếp in-play',
  'cash out linh hoạt',
  'thống kê bóng đá chi tiết',
  'phân tích kèo chuyên sâu',
  'dự đoán AI chính xác',
  'lịch thi đấu đầy đủ',
  'kết quả cập nhật realtime',
  'video highlights trận đấu',
  'stream trực tiếp miễn phí',
  'cược bóng rổ NBA',
  'cá cược tennis Grand Slam',
  'esports Dota2 CSGO LOL',
  'cược MMA UFC boxing',
  'đua xe F1 MotoGP',
  'golf với giải Major',
  'bóng chuyền bóng bàn',
  'cricket rugby',
  'cược tổng hợp thể thao',
  'cược ảo virtual sports',
  'đua chó đua ngựa ảo',
  'bóng đá ảo 24/7',
  'tỷ lệ cược cạnh tranh nhất',
  'giải đấu lớn toàn cầu',
  'World Cup Euro Copa',
  'Champions League Europa',
  'Premier League La Liga',

  // ═══ SLOT GAME (30) ═══
  'hàng ngàn slot game đỉnh cao',
  'slot 3D đồ họa tuyệt đẹp',
  'jackpot khủng hàng tỷ',
  'tỷ lệ thắng cao RTP 96%+',
  'freespin không giới hạn',
  'bonus game thú vị',
  'wild symbol may mắn',
  'scatter tung bung',
  'slot hiện đại từ Pragmatic Play',
  'game hot từ PG Soft',
  'NetEnt slot chất lượng',
  'Microgaming kinh điển',
  'slot chủ đề đa dạng',
  'slot Ai Cập bí ẩn',
  'slot trái cây cổ điển',
  'slot phiêu lưu hấp dẫn',
  'slot thần thoại huyền bí',
  'slot động vật dễ thương',
  'slot siêu anh hùng',
  'slot Asian theme',
  'demo slot chơi thử miễn phí',
  'hướng dẫn chơi slot hiệu quả',
  'chiến thuật quay slot thắng lớn',
  'quản lý vốn khi chơi slot',
  'chọn slot RTP cao',
  'thời điểm quay slot may mắn',
  'jackpot đã trúng gần đây',
  'top slot thắng nhiều nhất',
  'slot mới ra mắt hot',
  'tournament slot giải thưởng lớn',

  // ═══ GAME BÀI & POKER (20) ═══
  'poker Texas Holdem chuyên nghiệp',
  'Omaha poker thú vị',
  'tournament poker hàng ngày',
  'poker cash game mọi level',
  'bàn poker từ newbie đến pro',
  'tiến lên miền Nam sôi động',
  'phỏm đổi thưởng hấp dẫn',
  'mậu binh xập xám',
  'liêng 3 cây may mắn',
  'sâm lốc dân gian',
  'tá lả offline và online',
  'poker face với cao thủ',
  'chiến thuật poker hiệu quả',
  'đọc bài đối thủ',
  'quản lý bankroll poker',
  'tips từ pro player',
  'giải đấu poker lớn',
  'poker freeroll miễn phí',
  'bounty tournament hấp dẫn',
  'sit and go nhanh gọn',

  // ═══ BẮN CÁ & MINIGAME (20) ═══
  'bắn cá 3D đồ họa đẹp mắt',
  'bắn cá đổi thưởng hấp dẫn',
  'nhiều loại súng mạnh mẽ',
  'cá boss thưởng khủng',
  'tỷ lệ ăn thưởng cao',
  'kỹ năng đặc biệt hữu ích',
  'bắn cá nhiều người chơi',
  'phòng VIP bắn cá',
  'event bắn cá jackpot',
  'tài xỉu online công bằng',
  'xóc đĩa trực tuyến',
  'vòng quay may mắn',
  'lô đề online uy tín',
  'keno số đẹp',
  'Crash game x1000',
  'Aviator bay cao thắng lớn',
  'Plinko thả bi may mắn',
  'Mines tìm kim cương',
  'Dice xúc xắc đơn giản',
  'minigame đa dạng thú vị',

  // ═══ XỔ SỐ & LOTTO (15) ═══
  'xổ số miền Bắc chuẩn xác',
  'xổ số miền Trung mỗi ngày',
  'xổ số miền Nam đầy đủ',
  'mega 6/45 jackpot tỷ đồng',
  'power 6/55 giải khủng',
  'max 4D đa dạng',
  'kết quả xổ số tức thì',
  'thống kê xổ số chuyên sâu',
  'dự đoán số đẹp',
  'lô xiên chuẩn',
  'đề về nhiều',
  'cặp song thủ',
  'bao lô đánh nhanh',
  'lotto quốc tế Mega Millions',
  'Powerball jackpot khủng',

  // ═══ MOBILE APP (15) ═══
  'ứng dụng di động mượt mà',
  'tải app iOS App Store',
  'download app Android',
  'APK cài đặt dễ dàng',
  'app nhẹ chạy mượt',
  'giao diện app thân thiện',
  'tính năng đầy đủ như web',
  'cá cược mọi lúc mọi nơi',
  'thông báo push kịp thời',
  'cập nhật liên tục',
  'bảo mật cao trên mobile',
  'chơi offline và online',
  'tiết kiệm 3G 4G',
  'tối ưu pin điện thoại',
  'tương thích mọi smartphone',

  // ═══ BẢO MẬT & AN TOÀN (20) ═══
  'bảo mật SSL 256-bit chuẩn ngân hàng',
  'xác thực hai yếu tố 2FA',
  'mã hóa dữ liệu toàn diện',
  'chống hack chuyên nghiệp',
  'server an toàn tại Singapore',
  'sao lưu dữ liệu thường xuyên',
  'firewall bảo vệ tối đa',
  'giấy phép Curacao hợp pháp',
  'kiểm định GLI iTech Labs',
  'chứng nhận eCOGRA',
  'bảo vệ thông tin cá nhân',
  'không chia sẻ dữ liệu',
  'chính sách bảo mật rõ ràng',
  'hệ thống chống gian lận AI',
  'phát hiện tài khoản bất thường',
  'bảo vệ giao dịch tài chính',
  'xác minh danh tính KYC',
  'ngăn chặn rửa tiền',
  'tuân thủ quy định quốc tế',
  'môi trường chơi an toàn',

  // ═══ CSKH & HỖ TRỢ (20) ═══
  'hỗ trợ 24/7 không ngừng nghỉ',
  'live chat phản hồi tức thì',
  'hotline miễn phí',
  'email hỗ trợ nhanh chóng',
  'Telegram official support',
  'Facebook fanpage tương tác',
  'Zalo OA tư vấn',
  'đội ngũ CSKH chuyên nghiệp',
  'tư vấn nhiệt tình thân thiện',
  'giải quyết khiếu nại công bằng',
  'xử lý vấn đề nhanh gọn',
  'hỗ trợ đa ngôn ngữ',
  'FAQ đầy đủ chi tiết',
  'video hướng dẫn trực quan',
  'blog kiến thức bổ ích',
  'forum cộng đồng sôi động',
  'group chat người chơi',
  'chia sẻ kinh nghiệm',
  'tips từ cao thủ',
  'tài liệu hướng dẫn PDF',

  // ═══ ĐẠI LÝ & CTV (15) ═══
  'chương trình đại lý hấp dẫn',
  'hoa hồng không giới hạn',
  'hỗ trợ marketing đầy đủ',
  'tài liệu quảng bá chuyên nghiệp',
  'link giới thiệu độc quyền',
  'thống kê hoa hồng realtime',
  'thanh toán hoa hồng đúng hạn',
  'đào tạo đại lý miễn phí',
  'team support riêng cho agent',
  'công cụ quản lý downline',
  'bonus thành tích hàng tháng',
  'chính sách đãi ngộ hấp dẫn',
  'cơ hội thăng tiến rõ ràng',
  'cộng đồng đại lý chuyên nghiệp',
  'hội thảo đại lý định kỳ',

  // ═══ SỰ KIỆN & GIẢI ĐẤU (10) ═══
  'giải đấu slot hàng tháng',
  'tournament thể thao lớn',
  'event đặc biệt các ngày lễ',
  'racing leaderboard',
  'top thắng lớn nhất tuần',
  'giải thưởng tổng cộng tỷ đồng',
  'quà tặng giá trị hấp dẫn',
  'du lịch cho VIP',
  'siêu xe cho người may mắn',
  'gala trao giải hoành tráng',
];

// ── Templates prefix topic cho mode chạy link ─────────────────────────────
// Mỗi template nhận (kw, cat) và trả về phần đứng trước dấu — trong topic
// → tạo đa dạng topic string thay vì luôn là "kw — aspect"
const TOPIC_PREFIX_TEMPLATES = [
  (kw, cat) => cat ? `${cat} ${kw}` : kw,
  (kw, cat) => cat ? `review ${cat} ${kw}` : `review ${kw}`,
  (kw, cat) => cat ? `hướng dẫn ${cat} ${kw}` : `hướng dẫn ${kw}`,
  (kw, cat) => cat ? `kinh nghiệm ${cat} ${kw}` : `kinh nghiệm ${kw}`,
  (kw, cat) => cat ? `đánh giá ${cat} ${kw}` : `đánh giá ${kw}`,
  (kw, cat) => cat ? `${cat} ${kw} cho người mới` : `${kw} cho người mới`,
  (kw, cat) => cat ? `khám phá ${cat} ${kw}` : `khám phá ${kw}`,
  (kw, cat) => cat ? `tìm hiểu ${cat} ${kw}` : `tìm hiểu ${kw}`,
  (kw, cat) => cat ? `trải nghiệm ${cat} ${kw}` : `trải nghiệm ${kw}`,
  (kw, cat) => cat ? `phân tích ${cat} ${kw}` : `phân tích ${kw}`,
  (kw, cat) => cat ? `${cat} ${kw} từ A đến Z` : `${kw} từ A đến Z`,
  (kw, cat) => cat ? `${kw} ${cat}` : `nền tảng ${kw}`,
  (kw, cat) => cat ? `so sánh ${cat} ${kw}` : `so sánh ${kw}`,
  (kw, cat) => cat ? `cẩm nang ${cat} ${kw}` : `cẩm nang ${kw}`,
  (kw, cat) => cat ? `${cat} ${kw} thực tế` : `${kw} thực tế`,
];

// ── Nhận dạng anchor và rút keyword ────────────────────────────────────────
// 3 loại anchor:
// 1. Full URL   "https://789bet.agency/"  → keyword = domain key "789bet"
// 2. Domain     "789bet.com" / "789BET.COM" → keyword = bỏ TLD "789bet" / "789BET", anchor = giữ nguyên
// 3. Plain text "789BET" / "789 BET"      → keyword = text gốc, anchor = text gốc
function resolveAnchor(anchor) {
  const trimmed = (anchor || '').trim();
  if (!trimmed) return { keyword: '', anchorDisplay: '' };
  // Loại 1: có protocol
  if (/^https?:\/\//i.test(trimmed)) {
    const kw = extractDomainKey(trimmed);
    return { keyword: kw, anchorDisplay: kw };
  }
  // Loại 2: domain không có protocol (vd: 789bet.com, 789BET.COM, 789bet.vn, abc.net)
  if (/^[a-zA-Z0-9][a-zA-Z0-9\-]*\.[a-zA-Z]{2,6}$/.test(trimmed)) {
    const kw = trimmed.replace(/\.[a-zA-Z]{2,6}$/, ''); // bỏ TLD
    return { keyword: kw, anchorDisplay: trimmed };
  }
  // Loại 3: plain text anchor
  return { keyword: trimmed, anchorDisplay: trimmed };
}

// ── Gọi generate 1 bài qua SSE stream ────────────────────────────────────────
// keyword: anchor do người dùng nhập — dùng làm focus keyword cho bài viết
// language: 'vi' | 'en'
async function generateArticle(topic, model = 'gpt-4o-mini', keyword = '', language = 'vi') {
  const resp = await fetch('/api/generate/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topics: [topic], keywords: [keyword], model, language }),
  });
  if (!resp.ok) throw new Error(`Generate thất bại (HTTP ${resp.status})`);
  const reader  = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let article = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const chunks = buf.split('\n\n');
    buf = chunks.pop() || '';
    for (const chunk of chunks) {
      const lines = chunk.split('\n');
      let evtName = '', dataStr = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) evtName = line.slice(7);
        if (line.startsWith('data: '))  dataStr = line.slice(6);
      }
      if (!dataStr) continue;
      try {
        const payload = JSON.parse(dataStr);
        if (evtName === 'article') article = payload.article;
      } catch { /* ignore */ }
    }
  }
  return article;
}

// ── Mở rộng từ khóa ảnh: tách từ + thêm các từ liên quan tiếng Anh ──────────
function expandImageKeywords(kw) {
  if (!kw?.trim()) return ['digital', 'technology', 'business'];
  const base = kw.trim().toLowerCase();

  // Nếu keyword giống tên domain (không có dấu cách, thường là 1 từ ghép)
  // → tách theo camelCase / số / gạch ngang để đoán từ khoá thực
  const words = base
    .replace(/([a-z])([A-Z])/g, '$1 $2')   // camelCase → words
    .replace(/[-_]+/g, ' ')
    .replace(/\d+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(w => w.length > 2);

  // Nhóm từ khóa chủ đề → gợi ý ảnh tiếng Anh liên quan
  const themeMap = [
    { keys: ['bet','casino','game','slot','poker','gambling','luck','win'], tags: ['casino gambling','sports betting','poker cards','winning prize'] },
    { keys: ['crypto','coin','blockchain','token','defi','nft','bitcoin','eth'], tags: ['cryptocurrency','blockchain technology','digital coins','trading chart'] },
    { keys: ['tech','learn','hub','dev','code','software','app','digital'], tags: ['technology','software development','coding','digital innovation'] },
    { keys: ['shop','store','buy','sell','market','commerce','trade'], tags: ['online shopping','e-commerce','retail store','marketplace'] },
    { keys: ['health','medical','pharma','fit','gym','sport','wellness'], tags: ['healthcare','fitness wellness','medical technology','sport exercise'] },
    { keys: ['finance','bank','invest','loan','fund','money','pay'], tags: ['finance investment','banking','money management','financial technology'] },
    { keys: ['travel','tour','hotel','flight','holiday','trip','booking'], tags: ['travel destination','hotel tourism','vacation trip','adventure'] },
    { keys: ['news','blog','media','press','info','review','guide'], tags: ['news media','blogging','content creation','digital media'] },
  ];

  const matched = new Set(words);
  const extras = [];
  for (const { keys, tags } of themeMap) {
    if (keys.some(k => words.some(w => w.includes(k) || k.includes(w)))) {
      extras.push(...tags);
      break;
    }
  }

  // Danh sách từ khoá thử theo thứ tự: từ gốc → từ gốc tiếng Anh tách ra → theme → generic
  const candidates = [
    base,
    ...(words.length > 1 ? [words.join(' ')] : []),
    ...extras,
    'website online',
    'technology digital',
  ];

  // Loại trùng, giữ tối đa 5
  return [...new Set(candidates)].slice(0, 5);
}

// ── Tìm ảnh Pexels: thử nhiều từ khoá + trang ngẫu nhiên ───────────────────
async function searchImage(keyword) {
  if (!keyword?.trim()) return null;
  const candidates = expandImageKeywords(keyword);
  const pool = [];

  for (const q of candidates) {
    if (pool.length >= 8) break;                    // đủ ảnh rồi, dừng
    const page = Math.floor(Math.random() * 5) + 1; // trang ngẫu nhiên 1-5
    try {
      const resp = await fetch(
        `/api/images/search?q=${encodeURIComponent(q)}&per_page=5&page=${page}`
      );
      if (!resp.ok) continue;
      const data  = await resp.json();
      const found = data.photos || [];
      found.forEach(p => {
        // Tránh ảnh trùng URL
        if (!pool.some(x => x.url === p.url)) pool.push(p);
      });
    } catch { /* bỏ qua lỗi mạng */ }
  }

  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Đăng bài lên 1 site và chờ job hoàn tất qua SSE ──────────────────────
// onProgress(item): được gọi với mỗi bài khi publish xong {title, postUrl, status}
// Trả về: { completed, failed, postUrls: string[] }
async function postToSite(siteUrl, accountIdx, posts, onProgress) {
  // 1. Khởi động job
  const res = await fetch('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteUrl, accountIdx, posts }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Lỗi khi đăng bài');
  const { jobId } = data;

  // 2. Lắng nghe SSE cho đến khi done
  return new Promise((resolve, reject) => {
    const postUrls = [];
    let resolved = false;
    const es = new EventSource(`/api/jobs/${jobId}/stream`);

    es.addEventListener('progress', e => {
      try {
        const item = JSON.parse(e.data);
        if (item.postUrl) postUrls.push(item.postUrl);
        onProgress?.(item);
      } catch {}
    });

    es.addEventListener('done', e => {
      if (resolved) return;
      resolved = true;
      es.close();
      try {
        const result = JSON.parse(e.data);
        resolve({ ...result, postUrls });
      } catch { resolve({ postUrls }); }
    });

    es.onerror = (err) => {
      // SSE connection bị lỗi - có thể do timeout hoặc mất kết nối
      console.warn('SSE connection error:', err);
      
      // Đợi 3s để xem có reconnect được không
      setTimeout(() => {
        if (!resolved) {
          es.close();
          // Thay vì reject, chấp nhận kết quả đã có (partial success)
          console.log(`SSE closed. Got ${postUrls.length} results so far.`);
          resolve({ completed: postUrls.length, failed: 0, postUrls });
        }
      }, 3000);
    };

    // Timeout sau 10 phút - chấp nhận kết quả đã có
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        es.close();
        console.log(`Job timeout. Partial results: ${postUrls.length} posts`);
        resolve({ completed: postUrls.length, failed: 0, postUrls });
      }
    }, 600000); // 10 phút
  });
}

// ─────────────────────────────────────────────────────────────────────────────
export default function WorkflowPanel() {
  // ── Mode ──
  const [mode,    setMode]    = useState('cham'); // 'cham' | 'link'
  const [subMode, setSubMode] = useState('one');  // 'one' | 'many'  (chỉ dùng khi mode=cham)

  // ── Sites & Accounts ──
  const [sites,    setSites]    = useState([]);
  const [accounts, setAccounts] = useState([]);
  // ── Config chung ──
  const [imageKeyword, setImageKeyword] = useState('');
  const [anchorType,   setAnchorType]   = useState('keyword');
  const [anchorRel,    setAnchorRel]    = useState('dofollow');
  const [model,        setModel]        = useState('gpt-4o-mini');
  const [language,     setLanguage]     = useState('vi'); // 'vi' | 'en'

  // ── Chăm site – 1 bài/site: mỗi row = 1 site + 1 topic + link tuỳ chọn ──
  // keyword đã bỏ — tự rút từ anchor qua resolveAnchor()
  const EMPTY_ONE_ROW = { site: '', accountIdx: 0, topic: '', targetUrl: '', anchor: '' };
  const [oneRows, setOneRows] = useState([{ id: 1, ...EMPTY_ONE_ROW }]);

  function addOneRow() {
    setOneRows(prev => [...prev, { id: Date.now(), ...EMPTY_ONE_ROW }]);
  }
  function removeOneRow(id) {
    setOneRows(prev => prev.filter(r => r.id !== id));
  }
  function updateOneRow(id, field, val) {
    setOneRows(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
  }
  // Điền nhanh từ sites đã lưu
  function fillOneRowsFromSites() {
    if (!sites.length) return;
    setOneRows(sites.map((s, i) => ({ id: i + 1, ...EMPTY_ONE_ROW, site: s })));
  }

  // ── Chăm site – nhiều bài/site ──
  const [manySiteUrl,        setManySiteUrl]        = useState('');
  const [manySiteAccountIdx, setManySiteAccountIdx] = useState(0);
  const [manyTopicsText,     setManyTopicsText]      = useState(''); // 1 topic / dòng
  const [manyLinksText,      setManyLinksText]       = useState(''); // keyword | anchor | https://url

  const manyTopics = useMemo(() =>
    manyTopicsText.split('\n').map(l => l.trim()).filter(Boolean),
    [manyTopicsText]
  );
  // Format mỗi dòng: "keyword | anchor | https://url"
  // Format mới: "anchor | https://url"  (2 phần)
  //   anchor = text ("789BET") hoặc URL ("https://789bet.agency/") → resolveAnchor() tự rút keyword
  //   hoặc chỉ: "https://url" → anchor + keyword = domain key
  const manyLinks = useMemo(() =>
    manyLinksText.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
      const parts = line.split('|').map(p => p.trim());
      const url   = parts[parts.length - 1];
      if (!/^https?:\/\//.test(url)) return null;
      // Phần trước url = anchor (có thể là text hoặc URL link)
      const anchorRaw = parts.length >= 2 ? parts.slice(0, -1).join(' | ').trim() : '';
      return { anchor: anchorRaw || extractDomainKey(url), url };
    }).filter(Boolean),
    [manyLinksText]
  );

  // ── Link mode: import site URLs via textarea ──
  const [targetUrl,         setTargetUrl]         = useState('');
  const [anchorKeyword,     setAnchorKeyword]     = useState('');
  const [articleCategory,   setArticleCategory]   = useState('');
  const [linkSitesText,     setLinkSitesText]     = useState('');
  const [linkPairOverrides, setLinkPairOverrides] = useState({});

  const linkPairs = useMemo(() => {
    const lines = linkSitesText.split('\n').map(l => l.trim()).filter(l => /^https?:\/\//.test(l));
    return lines.map(site => ({ site, accountIdx: linkPairOverrides[site] ?? 0 }));
  }, [linkSitesText, linkPairOverrides]);

  // ── Batch link mode ──
  const [linkMode, setLinkMode] = useState('single'); // 'single' | 'batch'
  const [batchRows, setBatchRows] = useState([{
    id: 1,
    anchor: '',
    targetUrl: '',
    articleCount: 0,
    anchorType: 'keyword', // 'keyword' | 'url'
    pbnSites: '' // textarea content - one URL per line
  }]);

  const addBatchRow = () => {
    setBatchRows([...batchRows, {
      id: Date.now(),
      anchor: '',
      targetUrl: '',
      articleCount: 0,
      anchorType: 'keyword',
      pbnSites: ''
    }]);
  };

  const removeBatchRow = (id) => {
    if (batchRows.length <= 1) return; // Keep at least one row
    setBatchRows(batchRows.filter(r => r.id !== id));
  };

  const updateBatchRow = (id, field, value) => {
    setBatchRows(batchRows.map(r => 
      r.id === id ? { ...r, [field]: value } : r
    ));
  };

  // ── Run state ──
  const [running, setRunning] = useState(false);
  const [logs,    setLogs]    = useState([]);
  const [done,    setDone]    = useState(false);
  const logEndRef = useRef(null);
  const abortRef  = useRef(false);

  // Load sites + accounts
  useEffect(() => {
    fetch('/api/config/sites').then(r => r.json()).then(data => {
      const list = Array.isArray(data) ? data : [];
      setSites(list);
    }).catch(() => {});
    fetch('/api/config/accounts').then(r => r.json()).then(data => {
      setAccounts(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, []);

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  function addLog(type, text) {
    setLogs(prev => [...prev, { id: Date.now() + Math.random(), type, text }]);
  }

  // ── Main runner ───────────────────────────────────────────────────────────
  async function handleRun() {
    if (running) return;
    setRunning(true);
    setLogs([]);
    setDone(false);
    abortRef.current = false;

    try {
      // ── Mode: Chăm site – 1 bài/site ──────────────────────────────────────
      if (mode === 'cham' && subMode === 'one') {
        const validRows = oneRows.filter(r => r.site.trim() && r.topic.trim());
        if (!validRows.length) { addLog('error', '⚠ Chưa có dòng nào đủ Site + Chủ đề'); return; }
        addLog('info', `📋 Tổng: ${validRows.length} bài sẽ được tạo và đăng`);

        for (let i = 0; i < validRows.length; i++) {
          if (abortRef.current) break;
          const { site, accountIdx, topic } = validRows[i];

          const { targetUrl: rowUrl, anchor: rowAnchor } = validRows[i];
          const { keyword: focusKw, anchorDisplay: rowAnchorDisplay } = resolveAnchor(rowAnchor);
          addLog('info', `[${i + 1}/${validRows.length}] 🖊 "${topic}" → ${site.replace(/^https?:\/\/(www\.)?/, '')}`);
          const article = await generateArticle(topic, model, focusKw, language);
          if (!article || article.status === 'error') { addLog('error', `  ✗ Tạo bài thất bại`); continue; }
          addLog('ok', `  ✓ Tiêu đề: "${article.title}"`);

          const imgKw  = imageKeyword.trim() || domainKeywords(site);
          const photo  = await searchImage(imgKw);
          const imgCfg = photo ? { url: photo.url, alt: photo.alt, position: 'random' } : {};

          // Chèn link nếu row có cấu hình targetUrl + anchor
          const linkCfg1 = rowUrl.trim() && focusKw
            ? { url: rowUrl.trim(), keyword: focusKw, anchorDisplay: rowAnchorDisplay, rel: anchorRel, anchorType, count: 1 }
            : null;
          if (linkCfg1) addLog('info', `  🔗 Chèn link → ${rowUrl.trim()} | kw: "${focusKw}" | anchor: "${rowAnchorDisplay}"`);

          addLog('info', `  📤 Đăng lên ${site}…`);
          const result1 = await postToSite(site, accountIdx, [{
            title:            article.title,
            content:          processContent(article.content, linkCfg1, imgCfg),
            keyword:          article.keyword || extractDomainKey(site),
            slug:             article.slug    || '',
            meta_description: article.meta_description || '',
          }]);
          result1?.postUrls?.forEach(url => addLog('link', url));
          addLog('ok', `  ✓ Đăng thành công!`);
          if (result1.failed > 0) addLog('error', `  ⚠ ${result1.failed} bài thất bại`);
        }
      }

      // ── Mode: Chăm site – 1 site nhiều bài ────────────────────────────────
      else if (mode === 'cham' && subMode === 'many') {
        if (!manySiteUrl.trim()) { addLog('error', '⚠ Chưa nhập URL site'); return; }
        if (!manyTopics.length)  { addLog('error', '⚠ Chưa nhập chủ đề nào'); return; }
        addLog('info', `🌐 Site: ${manySiteUrl}`);
        addLog('info', `📋 ${manyTopics.length} chủ đề | ${manyLinks.length} link — mỗi bài chèn 1 link tương ứng`);

        let manyCompleted = 0;
        for (let ai = 0; ai < manyTopics.length; ai++) {
          if (abortRef.current) break;
          const topic = manyTopics[ai];
          addLog('info', `[${ai + 1}/${manyTopics.length}] 🖊 Viết "${topic}"…`);

          const lnkForKw = manyLinks[ai] || null;
          const focusKwMany = lnkForKw ? resolveAnchor(lnkForKw.anchor).keyword : '';
          const article = await generateArticle(topic, model, focusKwMany, language);
          if (!article) { addLog('error', `  ✗ Tạo bài thất bại`); continue; }
          addLog('ok', `  ✓ "${article.title}"`);

          const imgKw  = imageKeyword.trim() || domainKeywords(manySiteUrl);
          const photo  = await searchImage(imgKw);
          const imgCfg = photo ? { url: photo.url, alt: photo.alt, position: 'random' } : {};

          // Mỗi bài chỉ chèn 1 link ứng với index của chủ đề
          const lnk = lnkForKw;
          let linkCfg = null;
          if (lnk) {
            const { keyword: kw, anchorDisplay } = resolveAnchor(lnk.anchor);
            linkCfg = { url: lnk.url, anchorType, keyword: kw, anchorDisplay, rel: anchorRel, count: 1 };
            addLog('info', `  🔗 Link: ${lnk.url} | kw: "${kw}" | anchor: "${anchorType === 'url' ? lnk.url : anchorDisplay}"`);
          } else {
            addLog('info', `  — Không có link tương ứng cho bài này`);
          }

          const html = processContent(article.content, linkCfg, imgCfg);

          // Đăng ngay bài vừa viết, không chờ hết vòng lặp
          addLog('info', `  📤 Đăng bài [${ai + 1}/${manyTopics.length}] lên ${manySiteUrl}…`);
          const postData = [{
            title:            article.title,
            content:          html,
            keyword:          article.keyword || domainKeywords(manySiteUrl),
            slug:             article.slug    || '',
            meta_description: article.meta_description || '',
          }];
          const resultM = await postToSite(manySiteUrl, manySiteAccountIdx, postData);
          resultM?.postUrls?.forEach(url => addLog('link', url));
          manyCompleted++;
          addLog('ok', `  ✓ Đã đăng bài [${ai + 1}] (tổng: ${manyCompleted})`);
          if (resultM.failed > 0) addLog('error', `  ⚠ ${resultM.failed} bài thất bại`);
        }

        if (manyCompleted > 0) {
          addLog('ok', `✓ Hoàn tất: đã viết và đăng ${manyCompleted}/${manyTopics.length} bài!`);
        }
      }

      // ── Mode: Chạy link – BATCH MODE ──────────────────────────────────────
      else if (mode === 'link' && linkMode === 'batch') {
        addLog('info', `🔄 Batch mode: ${batchRows.length} nhóm anchor`);

        // Shuffle ASPECTS array để tránh trùng lặp góc độ (500 aspects chuyên nhà cái)
        const shuffledAspects = [...ASPECTS].sort(() => Math.random() - 0.5);
        // Shuffle prefix templates để đa dạng hóa topic → tránh title trùng lặp
        const shuffledPrefixes = [...TOPIC_PREFIX_TEMPLATES].sort(() => Math.random() - 0.5);

        // Process each batch row sequentially
        for (let batchIdx = 0; batchIdx < batchRows.length; batchIdx++) {
          if (abortRef.current) {
            addLog('warn', '🛑 Đã dừng bởi người dùng');
            break;
          }

          const row = batchRows[batchIdx];
          const pbnUrls = row.pbnSites.split('\n').filter(l => /^https?:\/\//.test(l.trim())).map(l => l.trim());
          
          // Extract keyword from anchor (if URL, get domain key like "xx88" from "https://xx88.vin/")
          const { keyword: extractedKeyword } = resolveAnchor(row.anchor);
          const focusKeyword = extractedKeyword || row.anchor;
          
          addLog('info', `\n[Batch ${batchIdx + 1}/${batchRows.length}] 🎯 Anchor: "${row.anchor}" → ${row.targetUrl}`);
          addLog('info', `  📊 ${pbnUrls.length} bài | keyword: "${focusKeyword}"`);

          // Generate and post each article for this batch
          for (let artIdx = 0; artIdx < pbnUrls.length; artIdx++) {
            if (abortRef.current) break;

            const siteUrl = pbnUrls[artIdx];
            const aspect = shuffledAspects[artIdx % shuffledAspects.length];
            // Đa dạng hóa format topic để AI tạo title khác nhau
            const prefixFn = shuffledPrefixes[artIdx % shuffledPrefixes.length];
            const prefix = prefixFn(focusKeyword, ''); // không dùng category cho batch mode
            const topic = `${prefix} — ${aspect}`;
            const siteKey = extractDomainKey(siteUrl);

            addLog('info', `  [${artIdx + 1}/${pbnUrls.length}] 🖊 "${topic}" → ${siteKey}`);

            // Generate article with extracted keyword
            const article = await generateArticle(topic, model, focusKeyword, language);
            if (!article) {
              addLog('error', `    ✗ Tạo bài thất bại`);
              continue;
            }
            addLog('ok', `    ✓ "${article.title}"`);

            // Get image
            const imgKw = imageKeyword.trim() || focusKeyword;
            const photo = await searchImage(imgKw);
            const altText = extractKeywordSentence(article.content, focusKeyword, 120, 1) || focusKeyword;
            const imgCfg = photo ? { url: photo.url, alt: altText, position: 'random' } : {};
            if (photo) {
              addLog('info', `    🖼 Ảnh: ${photo.url.slice(0, 60)}...`);
            }

            // Prepare link config
            // For 'url' mode: anchor text is "keyword tại url" with link on keyword+url
            // For 'keyword' mode: anchor text is keyword only with link
            const anchorDisplay = row.anchorType === 'keyword' 
              ? focusKeyword
              : `${focusKeyword} tại ${row.targetUrl}`;
            const linkCfg = {
              url: row.targetUrl,
              anchorType: row.anchorType,
              keyword: focusKeyword,
              anchorDisplay: anchorDisplay,
              rel: 'dofollow',
              count: 1
            };

            // Add internal link to homepage
            const internalPara = `\n<p>Tìm hiểu thêm các bài viết hữu ích tại <a href="${siteUrl}">${siteKey}</a>.</p>`;
            const finalContent = processContent(article.content + internalPara, linkCfg, imgCfg);

            // Meta description
            const extractedMeta = extractKeywordSentence(article.content, focusKeyword, 160, 2) || article.meta_description || '';

            // Post article
            addLog('info', `    📤 Đăng lên ${siteKey}…`);
            const result = await postToSite(siteUrl, 0, [{
              title: article.title,
              content: finalContent,
              keyword: article.keyword || focusKeyword,
              slug: article.slug || '',
              meta_description: extractedMeta,
            }]);
            
            result?.postUrls?.forEach(url => addLog('link', url));
            addLog('ok', `    ✓ Đăng thành công!`);
            if (result.failed > 0) addLog('error', `    ⚠ ${result.failed} bài thất bại`);
          }

          addLog('success', `✅ [Batch ${batchIdx + 1}/${batchRows.length}] Hoàn thành: "${row.anchor}" (${pbnUrls.length} bài)`);
        }
      }

      // ── Mode: Chạy link – SINGLE MODE (1 bài/site) ────────────────────────
      else if (mode === 'link' && linkMode === 'single') {
        const targetKey = extractDomainKey(targetUrl);
        // resolveAnchor: text ("789BET") → kw=789BET; URL ("https://789bet.agency/") → kw=789bet
        const { keyword: kw, anchorDisplay: kwDisplay } = resolveAnchor(anchorKeyword.trim());
        const linkCfg   = { url: targetUrl.trim(), anchorType, keyword: kw, anchorDisplay: kwDisplay, rel: anchorRel, count: 1 };
        addLog('info', `Target: ${targetUrl} | anchor: "${anchorKeyword.trim()}" | kw: "${kw}"`);

        // Xáo trộn ngẫu nhiên thứ tự aspects mỗi lần chạy
        // → tránh trùng topic khi chạy nhiều lần với anchor khác nhau cùng 1 URL
        const shuffledAspects = [...ASPECTS].sort(() => Math.random() - 0.5);
        // Xáo trộn riêng mảng prefix templates
        const shuffledPrefixes = [...TOPIC_PREFIX_TEMPLATES].sort(() => Math.random() - 0.5);

        for (let i = 0; i < linkPairs.length; i++) {
          if (abortRef.current) break;
          const { site, accountIdx } = linkPairs[i];
          const siteKey = extractDomainKey(site);
          const aspect  = shuffledAspects[i % shuffledAspects.length];
          const catBase = articleCategory.trim();
          // Tránh lặp: nếu keyword đã chứa category thì không prepend nữa
          const safecat = catBase && !kw.toLowerCase().includes(catBase.toLowerCase()) ? catBase : '';
          // Chọn prefix template xoay vòng — tạo topic string đa dạng
          const prefixFn = shuffledPrefixes[i % shuffledPrefixes.length];
          const prefix   = prefixFn(kw, safecat);
          const topic    = `${prefix} — ${aspect}`;
          addLog('info', `[${i + 1}/${linkPairs.length}] Tao bai: "${topic}" → đăng lên ${siteKey}`);

          const article = await generateArticle(topic, model, kw, language);
          if (!article) { addLog('error', `  ✗ Tạo bài thất bại`); continue; }
          addLog('ok', `  ✓ "${article.title}"`);

          const imgKw  = imageKeyword.trim() || kw || targetKey;
          const photo  = await searchImage(imgKw);

          // Alt text: trích câu chứa keyword từ nội dung bài (keyword → hết 2 câu)
          // Ví dụ: "789bet đã ghi dấu ấn mạnh mẽ... yên tâm khi tham gia cá cược tại đây."
          const altText = extractKeywordSentence(article.content, kw, 120, 1) || kw || imgKw;
          const imgCfg  = photo ? { url: photo.url, alt: altText, position: 'random' } : {};
          if (photo) addLog('info', `  🖼 alt: "${altText.slice(0, 60)}…"`);

          // Meta description: keyword → hết 2 câu, tối đa 160 ký tự
          const extractedMeta = extractKeywordSentence(article.content, kw, 160, 2)
                              || article.meta_description
                              || '';

          // Internal link → homepage của satellite site (Rank Math yêu cầu có internal link)
          const internalPara = `\n<p>Tìm hiểu thêm các bài viết hữu ích tại <a href="${site}">${siteKey}</a>.</p>`;
          const finalContent = processContent(article.content + internalPara, linkCfg, imgCfg);
          addLog('info', `  📝 Meta: "${extractedMeta.slice(0, 60)}…"`);
          addLog('info', `  📤 Đăng lên ${site}…`);
          const result = await postToSite(site, accountIdx, [{
            title:            article.title,
            content:          finalContent,
            keyword:          article.keyword  || kw,
            slug:             article.slug     || '',
            meta_description: extractedMeta,
          }]);
          result?.postUrls?.forEach(url => addLog('link', url));
          addLog('ok', `  ✓ Đăng thành công!`);
        }
      }

      addLog('ok', '🎉 Hoàn thành tất cả!');
      setDone(true);
    } catch (err) {
      addLog('error', `❌ Lỗi: ${err.message}`);
    } finally {
      setRunning(false);
    }
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const totalArticles =
    mode === 'link' && linkMode === 'batch'
      ? batchRows.reduce((sum, row) => sum + (row.articleCount || 0), 0)
    : mode === 'link' && linkMode === 'single'
      ? linkPairs.length
    : mode === 'cham' && subMode === 'one'
      ? oneRows.filter(r => r.site.trim() && r.topic.trim()).length
    : /* cham many */
      manyTopics.length;

  const canRun =
    mode === 'link' && linkMode === 'batch'
      ? batchRows.length > 0 && batchRows.every(row => {
          const pbnUrls = row.pbnSites.split('\n').filter(l => /^https?:\/\//.test(l.trim()));
          return row.anchor.trim() !== '' 
            && row.targetUrl.trim() !== '' 
            && row.articleCount > 0 
            && pbnUrls.length === row.articleCount;
        })
    : mode === 'link' && linkMode === 'single'
      ? linkPairs.length > 0 && targetUrl.trim() !== '' && anchorKeyword.trim() !== ''
    : mode === 'cham' && subMode === 'one'
      ? oneRows.some(r => r.site.trim() && r.topic.trim()) && accounts.length > 0
    : /* cham many */
      manySiteUrl.trim() !== '' && manyTopics.length > 0 && accounts.length > 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── 1. Mode selector ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-200 mb-3">Chọn mode chiến dịch</h3>

        {/* Main mode */}
        <div className="flex gap-2 mb-3">
          {[
            ['cham', '🌱', 'Chăm site', 'Đăng bài để nuôi site PBN'],
            ['link', '🔗', 'Chạy link', 'Đăng bài có link về site mục tiêu'],
          ].map(([key, icon, label, desc]) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={`flex-1 text-left px-4 py-3 rounded-lg border transition-colors ${
                mode === key
                  ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200'
                  : 'border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600'
              }`}
            >
              <div className="font-semibold text-sm">{icon} {label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
            </button>
          ))}
        </div>

        {/* Sub-mode (only for chăm) */}
        {mode === 'cham' && (
          <div className="flex gap-2">
            {[
              ['one',  '1 bài / site',        'Mỗi site 1 bài, tự chọn chủ đề riêng'],
              ['many', '1 site / nhiều bài',   'Nhiều bài + nhiều link cho 1 site'],
            ].map(([key, label, desc]) => (
              <button
                key={key}
                onClick={() => setSubMode(key)}
                className={`flex-1 text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                  subMode === key
                    ? 'border-green-500 bg-green-950/30 text-green-300'
                    : 'border-gray-700 text-gray-400 hover:text-gray-200'
                }`}
              >
                <div className="font-semibold">{label}</div>
                <div className="text-gray-500 mt-0.5">{desc}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── 2. Config theo mode ── */}

      {/* Chăm – 1 bài/site: bảng site + chủ đề */}
      {mode === 'cham' && subMode === 'one' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-200">Danh sách bài cần đăng</h3>
            <div className="flex gap-2">
              {sites.length > 0 && (
                <button onClick={fillOneRowsFromSites}
                  className="text-xs px-2.5 py-1 rounded border border-gray-700 text-gray-400 hover:text-gray-200">
                  Điền từ sites đã lưu
                </button>
              )}
              <button onClick={addOneRow}
                className="text-xs px-2.5 py-1 rounded border border-indigo-700 text-indigo-400 hover:text-indigo-300">
                + Thêm dòng
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {oneRows.map((row) => (
              <div key={row.id} className="border border-gray-800 rounded-lg px-3 py-2.5 space-y-2">
                {/* Dòng 1: site + tài khoản + chủ đề + xoá */}
                <div className="grid grid-cols-[1fr_140px_1.5fr_28px] gap-2 items-center">
                  <input
                    className="input-field text-xs py-1"
                    placeholder="https://site.com/"
                    value={row.site}
                    onChange={e => updateOneRow(row.id, 'site', e.target.value)}
                  />
                  <select
                    className="input-field text-xs py-1"
                    value={row.accountIdx}
                    onChange={e => updateOneRow(row.id, 'accountIdx', +e.target.value)}
                  >
                    {accounts.length === 0
                      ? <option value={0}>— Chưa có TK —</option>
                      : accounts.map(acc => (
                          <option key={acc.idx} value={acc.idx}>{acc.label || acc.username}</option>
                        ))
                    }
                  </select>
                  <input
                    className="input-field text-xs py-1"
                    placeholder="Chủ đề: 789bet — tổng quan và đánh giá"
                    value={row.topic}
                    onChange={e => updateOneRow(row.id, 'topic', e.target.value)}
                  />
                  <button onClick={() => removeOneRow(row.id)}
                    className="text-gray-600 hover:text-red-400 text-sm font-bold leading-none">
                    ✕
                  </button>
                </div>
                {/* Dòng 2: link tuỳ chọn */}
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="input-field text-xs py-1"
                    placeholder="URL đích (tuỳ chọn)"
                    value={row.targetUrl}
                    onChange={e => updateOneRow(row.id, 'targetUrl', e.target.value)}
                  />
                  <input
                    className="input-field text-xs py-1"
                    placeholder="Anchor: text (789BET) hoặc URL (https://789bet.agency/)"
                    title="Anchor text → tìm trực tiếp trong bài. Anchor URL → tự rút keyword từ domain."
                    value={row.anchor}
                    onChange={e => updateOneRow(row.id, 'anchor', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chăm – 1 site nhiều bài */}
      {mode === 'cham' && subMode === 'many' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-200">Cấu hình site & nội dung</h3>

          {/* Site target */}
          <div className="grid grid-cols-[1fr_200px] gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">URL site sẽ đăng bài <span className="text-red-400">*</span></label>
              <input className="input-field w-full text-sm"
                placeholder="https://pbn-site.com/"
                value={manySiteUrl}
                onChange={e => setManySiteUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Tài khoản</label>
              <select className="input-field w-full text-sm"
                value={manySiteAccountIdx}
                onChange={e => setManySiteAccountIdx(+e.target.value)}
              >
                {accounts.length === 0
                  ? <option value={0}>— Chưa có tài khoản —</option>
                  : accounts.map(acc => (
                      <option key={acc.idx} value={acc.idx}>{acc.label || acc.username}</option>
                    ))
                }
              </select>
            </div>
          </div>

          {/* Chủ đề */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Chủ đề bài viết <span className="text-red-400">*</span>
              <span className="text-gray-500 font-normal ml-1">— mỗi dòng 1 chủ đề → {manyTopics.length} bài</span>
            </label>
            <textarea
              className="input-field w-full text-xs font-mono resize-y h-28"
              placeholder={`789bet — tổng quan và giới thiệu\n789bet — hướng dẫn đăng ký\n789bet — đánh giá khuyến mãi\n...`}
              value={manyTopicsText}
              onChange={e => setManyTopicsText(e.target.value)}
            />
          </div>

          {/* Links */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Links chèn vào mỗi bài
              <span className="text-gray-500 font-normal ml-1">
                — format: <code className="text-amber-400">anchor | https://url</code>
                &nbsp;·&nbsp;anchor = text (<code className="text-yellow-400">789BET</code>) hoặc URL (<code className="text-yellow-400">https://789bet.agency/</code>)
                &nbsp;({manyLinks.length} link)
              </span>
            </label>
            <textarea
              className="input-field w-full text-xs font-mono resize-y h-28"
              placeholder={`789BET | https://789bet.com/\nhttps://789bet.agency/ | https://789bet.com/\nhttps://789bet.io/\n...`}
              value={manyLinksText}
              onChange={e => setManyLinksText(e.target.value)}
            />
            {manyLinks.length > 0 && (
              <div className="mt-2 space-y-1">
                {manyLinks.map((lnk, i) => (
                  <div key={i} className="text-xs text-gray-500 flex gap-2 items-center">
                    <span className="text-gray-400">anchor:</span>
                    <span className="text-amber-400">{lnk.anchor}</span>
                    <span className="text-gray-600">│</span>
                    <span className="text-gray-400">kw:</span>
                    <span className="text-yellow-400">{resolveAnchor(lnk.anchor).keyword}</span>
                    <span>→</span>
                    <span className="text-blue-400 truncate">{lnk.url}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Link mode: single or batch */}
      {mode === 'link' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          {/* Toggle single/batch mode */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-200">Link Mode</h3>
            <div className="flex gap-2">
              {[['single', '📝 Single'], ['batch', '📊 Batch']].map(([val, label]) => (
                <button key={val} onClick={() => setLinkMode(val)}
                  className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                    linkMode === val
                      ? 'border-green-500 text-green-300 bg-green-950/30'
                      : 'border-gray-700 text-gray-400 hover:text-gray-200'
                  }`}>{label}</button>
              ))}
            </div>
          </div>

          {/* ── SINGLE MODE ── */}
          {linkMode === 'single' && (
            <>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-gray-300">URL các site PBN</h4>
                <span className="text-xs text-gray-500">{linkPairs.length} site</span>
              </div>
              <textarea
                className="input-field w-full text-xs font-mono resize-y h-32"
                placeholder={`https://pbn-site-1.com/\nhttps://pbn-site-2.net/\n...`}
                value={linkSitesText}
                onChange={e => setLinkSitesText(e.target.value)}
              />
              {linkPairs.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <div className="grid grid-cols-[1fr_160px] gap-2 text-xs text-gray-500 px-1">
                    <span>URL site</span><span>Tài khoản</span>
                  </div>
                  {linkPairs.map((pair) => (
                    <div key={pair.site} className="grid grid-cols-[1fr_160px] gap-2 items-center">
                      <div className="text-xs text-gray-300 truncate" title={pair.site}>
                        {pair.site.replace(/^https?:\/\/(www\.)?/, '')}
                      </div>
                      <select
                        className="input-field text-xs py-1"
                        value={pair.accountIdx}
                        onChange={e => setLinkPairOverrides(prev => ({ ...prev, [pair.site]: +e.target.value }))}
                      >
                        {accounts.length === 0
                          ? <option value={0}>— Chưa có tài khoản —</option>
                          : accounts.map(acc => (
                              <option key={acc.idx} value={acc.idx}>{acc.label || acc.username}</option>
                            ))
                        }
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── BATCH MODE ── */}
          {linkMode === 'batch' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-400">
                Nhập nhiều anchor cùng lúc. Mỗi anchor sẽ chạy tuần tự (finish hết bài anchor 1 trước khi chạy anchor 2).
              </p>

              {/* Batch rows */}
              <div className="space-y-4">
                {batchRows.map((row, idx) => {
                  const pbnUrls = row.pbnSites.split('\n').filter(l => /^https?:\/\//.test(l.trim()));
                  const urlCountMatch = pbnUrls.length === row.articleCount && row.articleCount > 0;
                  
                  return (
                    <div key={row.id} className="border border-gray-700 rounded-lg p-4 space-y-3 bg-gray-800/50">
                      {/* Row header */}
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-gray-200">Anchor #{idx + 1}</h4>
                        <div className="flex items-center gap-2">
                          {urlCountMatch && row.articleCount > 0 && (
                            <span className="text-xs text-green-400">✓ {row.articleCount} bài</span>
                          )}
                          {!urlCountMatch && row.articleCount > 0 && (
                            <span className="text-xs text-red-400">⚠ {pbnUrls.length}/{row.articleCount} URLs</span>
                          )}
                          {batchRows.length > 1 && (
                            <button
                              onClick={() => removeBatchRow(row.id)}
                              className="text-xs px-2 py-1 text-red-400 hover:text-red-300 border border-red-800 hover:border-red-700 rounded transition-colors"
                            >🗑️ Xóa</button>
                          )}
                        </div>
                      </div>

                      {/* Anchor text */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          Anchor text <span className="text-red-400">*</span>
                        </label>
                        <input
                          className="input-field w-full text-sm"
                          placeholder="xx88"
                          value={row.anchor}
                          onChange={e => updateBatchRow(row.id, 'anchor', e.target.value)}
                        />
                      </div>

                      {/* Target URL */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          Target URL <span className="text-red-400">*</span>
                        </label>
                        <input
                          className="input-field w-full text-sm"
                          placeholder="https://xx88.vin/"
                          value={row.targetUrl}
                          onChange={e => updateBatchRow(row.id, 'targetUrl', e.target.value)}
                        />
                      </div>

                      {/* Article count */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          Số bài viết <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="number"
                          className="input-field w-32 text-sm"
                          placeholder="35"
                          min="1"
                          value={row.articleCount || ''}
                          onChange={e => updateBatchRow(row.id, 'articleCount', parseInt(e.target.value) || 0)}
                        />
                      </div>

                      {/* Anchor type */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Loại anchor</label>
                        <div className="flex gap-2">
                          {[
                            ['keyword', '🏷 Keyword → <a>xx88</a>'],
                            ['url', '🌐 URL → <a>xx88 tại https://...</a>']
                          ].map(([val, label]) => (
                            <button key={val}
                              onClick={() => updateBatchRow(row.id, 'anchorType', val)}
                              className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                                row.anchorType === val
                                  ? 'border-blue-500 text-blue-300 bg-blue-950/30'
                                  : 'border-gray-700 text-gray-400 hover:text-gray-200'
                              }`}
                            >{label}</button>
                          ))}
                        </div>
                      </div>

                      {/* PBN sites textarea */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          PBN sites <span className="text-red-400">*</span>
                          <span className="text-gray-500 ml-1">
                            — mỗi dòng 1 URL, cần đúng {row.articleCount || 0} URLs
                          </span>
                        </label>
                        <textarea
                          className={`input-field w-full text-xs font-mono resize-y h-28 ${
                            !urlCountMatch && row.articleCount > 0 ? 'border-red-500' : ''
                          }`}
                          placeholder={`https://site1.com\nhttps://site2.com\n...`}
                          value={row.pbnSites}
                          onChange={e => updateBatchRow(row.id, 'pbnSites', e.target.value)}
                        />
                        {pbnUrls.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Đã nhập: {pbnUrls.length} URLs
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add row button */}
              <button
                onClick={addBatchRow}
                className="w-full py-2 text-sm border border-dashed border-gray-600 text-gray-400 hover:text-gray-200 hover:border-gray-500 rounded-lg transition-colors"
              >+ Thêm anchor</button>

              {/* Shared settings for batch mode */}
              <div className="border-t border-gray-700 pt-4 space-y-3">
                <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Cài đặt chung</h4>
                
                {/* Image keyword */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Từ khóa tìm ảnh (Pexels)</label>
                  <input
                    className="input-field w-full text-sm"
                    placeholder="Để trống → tự lấy từ anchor"
                    value={imageKeyword}
                    onChange={e => setImageKeyword(e.target.value)}
                  />
                </div>

                {/* Fixed settings display */}
                <div className="flex flex-wrap gap-3 text-xs">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <span className="text-green-400">✓</span> Random aspect (tự động chọn góc độ)
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <span className="text-green-400">✓</span> Dofollow links
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 3. Campaign config ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-200">Cấu hình chiến dịch</h3>

        {/* Link mode SINGLE: URL đích + keyword */}
        {mode === 'link' && linkMode === 'single' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">URL đích <span className="text-red-400">*</span></label>
              <input className="input-field w-full text-sm"
                placeholder="https://target-site.com/"
                value={targetUrl}
                onChange={e => setTargetUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Anchor <span className="text-red-400">*</span>
                <span className="text-gray-500 font-normal ml-1">
                  — text (<code className="text-yellow-400">789BET</code>) hoặc URL (<code className="text-yellow-400">https://789bet.agency/</code>)
                </span>
              </label>
              <input className="input-field w-full text-sm"
                placeholder="789BET  hoặc  https://789bet.agency/"
                value={anchorKeyword}
                onChange={e => setAnchorKeyword(e.target.value)}
              />
              {anchorKeyword.trim() && (
                <p className="text-xs text-gray-500 mt-1">
                  keyword rút: <span className="text-yellow-400">{resolveAnchor(anchorKeyword.trim()).keyword}</span>
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Lĩnh vực bài viết
                <span className="text-gray-500 font-normal ml-1">— kết hợp với keyword để tạo chủ đề bài</span>
              </label>
              <div className="flex gap-2">
                <select
                  className="input-field text-sm flex-none w-44"
                  value={articleCategory}
                  onChange={e => setArticleCategory(e.target.value)}
                >
                  <option value="">-- Tự động --</option>
                  <optgroup label="-- Cờ bạc / Casino --">
                    <option value="nhà cái">nhà cái</option>
                    <option value="casino trực tuyến">casino trực tuyến</option>
                    <option value="game bài">game bài</option>
                    <option value="cá cược thể thao">cá cược thể thao</option>
                    <option value="cá độ bóng đá">cá độ bóng đá</option>
                    <option value="slot game">slot game</option>
                    <option value="xổ số">xổ số</option>
                    <option value="poker">poker</option>
                    <option value="baccarat">baccarat</option>
                    <option value="tài xỉu">tài xỉu</option>
                    <option value="bắn cá">bắn cá</option>
                    <option value="lô đề">lô đề</option>
                    <option value="esports cá cược">esports cá cược</option>
                    <option value="đánh bài trực tuyến">đánh bài trực tuyến</option>
                    <option value="nạp rút tiền nhà cái">nạp rút tiền nhà cái</option>
                    <option value="khuyến mãi nhà cái">khuyến mãi nhà cái</option>
                  </optgroup>
                  <optgroup label="-- Thể thao --">
                    <option value="thể thao">thể thao</option>
                    <option value="bóng đá">bóng đá</option>
                    <option value="bóng rổ">bóng rổ</option>
                    <option value="tennis">tennis</option>
                    <option value="esports">esports</option>
                  </optgroup>
                  <optgroup label="-- Công nghệ / Tài chính --">
                    <option value="công nghệ">công nghệ</option>
                    <option value="tài chính">tài chính</option>
                    <option value="crypto tiền điện tử">crypto tiền điện tử</option>
                  </optgroup>
                  <optgroup label="-- Khác --">
                    <option value="giải trí">giải trí</option>
                    <option value="sức khỏe">sức khỏe</option>
                    <option value="du lịch">du lịch</option>
                    <option value="ẩm thực">ẩm thực</option>
                  </optgroup>
                </select>
                <input
                  className="input-field text-sm flex-1"
                  placeholder="Hoặc nhập tự do: gaming, crypto..."
                  value={articleCategory}
                  onChange={e => setArticleCategory(e.target.value)}
                />
              </div>
              {articleCategory.trim() && resolveAnchor(anchorKeyword.trim()).keyword && (() => {
                const cat = articleCategory.trim();
                const kw2 = resolveAnchor(anchorKeyword.trim()).keyword;
                const prefix = !kw2.toLowerCase().includes(cat.toLowerCase()) ? `${cat} ` : '';
                return (
                  <p className="text-xs text-gray-500 mt-1">
                    chu de bai: <span className="text-green-400">{prefix}{kw2}</span>
                  </p>
                );
              })()}
            </div>
          </div>
        )}

        {/* Link mode BATCH: Config is embedded in batch rows */}
        {mode === 'link' && linkMode === 'batch' && (
          <div className="text-sm text-gray-400">
            ℹ️ Cấu hình đã được nhập ở phần Batch rows bên trên
          </div>
        )}

        {/* Image keyword (only for single mode) */}
        {!(mode === 'link' && linkMode === 'batch') && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">Từ khóa tìm ảnh (Pexels)</label>
            <input
              className="input-field w-full text-sm"
              placeholder="Để trống → tự lấy từ domain site"
              value={imageKeyword}
              onChange={e => setImageKeyword(e.target.value)}
            />
          </div>
        )}

        {/* Anchor config (link SINGLE mode + cham many) */}
        {((mode === 'link' && linkMode === 'single') || (mode === 'cham' && subMode === 'many')) && (
          <div className="border-t border-gray-800 pt-4 space-y-3">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Link anchor</p>

            <div className="flex flex-wrap gap-4">
              {/* Loại anchor */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Loại chèn</label>
                <div className="flex gap-1.5">
                  {[['keyword', '🏷 Keyword'], ['url', '🌐 URL địa chỉ']].map(([val, label]) => (
                    <button key={val} onClick={() => setAnchorType(val)}
                      className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                        anchorType === val
                          ? 'border-blue-500 text-blue-300 bg-blue-950/30'
                          : 'border-gray-700 text-gray-400 hover:text-gray-200'
                      }`}>{label}</button>
                  ))}
                </div>
              </div>

              {/* Rel */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Rel</label>
                <div className="flex gap-1.5">
                  {[['dofollow', 'dofollow'], ['nofollow', 'nofollow']].map(([val, label]) => (
                    <button key={val} onClick={() => setAnchorRel(val)}
                      className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                        anchorRel === val
                          ? 'border-purple-500 text-purple-300 bg-purple-950/30'
                          : 'border-gray-700 text-gray-400 hover:text-gray-200'
                      }`}>{label}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview anchor format */}
            <p className="text-xs text-gray-500">
              {anchorType === 'keyword'
                ? <>Kết quả: <code className="text-amber-400">"keyword"</code> → <em className="text-blue-400 not-italic">linked</em></>
                : <>Kết quả: <code className="text-amber-400">"keyword"</code>{' '}tại{' '}<code className="text-blue-400">url</code> → linked</>
              }
            </p>
          </div>
        )}

        {/* AI Model */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">AI Model</label>
          <select className="input-field w-48 text-sm" value={model} onChange={e => setModel(e.target.value)}>
            <option value="gpt-4o-mini">gpt-4o-mini (nhanh, rẻ)</option>
            <option value="gpt-4o">gpt-4o (chất lượng cao)</option>
            <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
          </select>
        </div>

        {/* Language */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Ngôn ngữ bài viết</label>
          <select className="input-field w-48 text-sm" value={language} onChange={e => setLanguage(e.target.value)}>
            <option value="vi">🇻🇳 Tiếng Việt</option>
            <option value="en">🇬🇧 English</option>
          </select>
        </div>
      </div>

      {/* ── 4. Summary & Run ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        {/* Summary */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="text-sm text-gray-300 space-y-1">
            <p className="font-semibold">
              {mode === 'cham' && subMode === 'one'  && '🌱 Chăm site – 1 bài / site'}
            {mode === 'cham' && subMode === 'many' && '🌱 Chăm site – 1 site nhiều bài'}
              {mode === 'link'                        && '🔗 Chạy link – 1 bài / site'}
            </p>
            <p className="text-xs text-gray-400">
              <strong className="text-white">{totalArticles} bài</strong> sẽ được tạo & đăng
            </p>
            {mode === 'link' && linkMode === 'single' && targetUrl.trim() && (
              <p className="text-xs text-blue-400">Target: {targetUrl.trim()} — anchor: <strong>{anchorKeyword || '—'}</strong>{anchorKeyword && <span className="text-yellow-400 ml-1">(kw: {resolveAnchor(anchorKeyword).keyword})</span>}</p>
            )}
            {mode === 'link' && linkMode === 'batch' && batchRows.length > 0 && (
              <p className="text-xs text-blue-400">
                {batchRows.length} batch row{batchRows.length > 1 ? 's' : ''} — Tổng: {totalArticles} bài
              </p>
            )}
            {mode === 'cham' && subMode === 'many' && manyLinks.length > 0 && (
              <p className="text-xs text-amber-400">{manyLinks.length} link sẽ chèn vào mỗi bài</p>
            )}
            {!canRun && (
              <p className="text-xs text-red-400">
                {accounts.length === 0 && mode !== 'link' && '⚠ Chưa có tài khoản. '}
                {mode === 'link' && linkMode === 'single' && linkPairs.length === 0 && '⚠ Chưa nhập URL site. '}
                {mode === 'link' && linkMode === 'single' && !targetUrl.trim() && '⚠ Chưa nhập URL đích. '}
                {mode === 'link' && linkMode === 'single' && !anchorKeyword.trim() && '⚠ Chưa nhập anchor. '}
                {mode === 'link' && linkMode === 'batch' && batchRows.length === 0 && '⚠ Chưa có batch row nào. '}
                {mode === 'link' && linkMode === 'batch' && batchRows.some(row => !row.anchor.trim()) && '⚠ Có row thiếu anchor. '}
                {mode === 'link' && linkMode === 'batch' && batchRows.some(row => !row.targetUrl.trim()) && '⚠ Có row thiếu target URL. '}
                {mode === 'link' && linkMode === 'batch' && batchRows.some(row => {
                  const pbnUrls = row.pbnSites.split('\n').filter(l => /^https?:\/\//.test(l.trim()));
                  return pbnUrls.length !== row.articleCount;
                }) && '⚠ Có row số URL không khớp với số bài. '}
                {mode === 'cham' && subMode === 'one' && !oneRows.some(r => r.site.trim() && r.topic.trim()) && '⚠ Chưa có dòng nào đủ Site + Chủ đề. '}
                {mode === 'cham' && subMode === 'many' && !manySiteUrl.trim() && '⚠ Chưa nhập URL site. '}
                {mode === 'cham' && subMode === 'many' && !manyTopics.length && '⚠ Chưa nhập chủ đề nào.'}
              </p>
            )}
          </div>

          <div className="flex gap-2 shrink-0">
            {running && (
              <button
                onClick={() => { abortRef.current = true; }}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-red-700 text-red-400 hover:bg-red-950/30 transition-colors"
              >⏹ Dừng</button>
            )}
            <button
              onClick={handleRun}
              disabled={running || !canRun}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition-colors"
            >
              {running ? '⏳ Đang chạy…' : '▶ Bắt đầu'}
            </button>
          </div>
        </div>

        {/* Progress log */}
        {logs.length > 0 && (
          <div className="bg-gray-950 border border-gray-800/50 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800/50">
              <span className="text-xs text-gray-500 font-mono">{logs.length} sự kiện</span>
              <a href="/api/permalinks.txt" target="_blank" rel="noreferrer"
                className="text-xs text-cyan-500 hover:text-cyan-300">
                📎 xem tất cả permalinks
              </a>
            </div>
            <div className="p-3 space-y-0.5 max-h-80 overflow-y-auto font-mono text-xs">
            {logs.map(log => (
              log.type === 'link'
                ? <div key={log.id} className="text-cyan-400 pl-2 border-l border-cyan-800">
                    <a href={log.text} target="_blank" rel="noreferrer"
                          className="underline hover:text-cyan-200 break-all">{log.text}</a>
                  </div>
                : <div key={log.id} className={
                    log.type === 'ok'    ? 'text-green-400' :
                    log.type === 'error' ? 'text-red-400'   :
                    'text-gray-400'
                  }>{log.text}</div>
            ))}
            <div ref={logEndRef} />
            </div>
          </div>
        )}

        {done && (
          <div className="mt-3 text-center text-sm text-green-400 font-semibold">
            🎉 Hoàn thành! Tất cả bài đã được tạo và đăng.
          </div>
        )}
      </div>
    </div>
  );
}
