import { z } from 'zod';

export const PostItemSchema = z.object({
  title:            z.string().min(1, 'Tiêu đề không được để trống').max(500),
  content:          z.string().min(1, 'Nội dung không được để trống'),
  // SEO meta fields (optional — used to set Rank Math / Yoast via WP REST API)
  keyword:          z.string().optional(),
  slug:             z.string().optional(),
  meta_description: z.string().optional(),
});

export const JobRequestSchema = z
  .object({
    siteUrl: z
      .string()
      .url({ message: 'URL không hợp lệ (cần có https://)' })
      .transform((u) => u.replace(/\/$/, '')),
    // Chọn tài khoản từ danh sách (accountIdx) — hoặc nhập trực tiếp
    accountIdx: z.number().int().nonnegative().optional(),
    username: z.string().min(1).optional(),
    password: z.string().min(1).optional(),
    posts: z
      .array(PostItemSchema)
      .min(1, 'Cần ít nhất 1 bài viết')
      .max(100, 'Tối đa 100 bài một lần'),
  })
  .refine(
    (d) => d.accountIdx !== undefined || (d.username && d.password),
    { message: 'Cần chọn tài khoản hoặc nhập username/password' }
  );
