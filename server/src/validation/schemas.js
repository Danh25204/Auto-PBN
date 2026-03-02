import { z } from 'zod';

export const PostItemSchema = z.object({
  title: z.string().min(1, 'Tiêu đề không được để trống').max(500),
  content: z.string().min(1, 'Nội dung không được để trống'),
});

export const JobRequestSchema = z.object({
  siteUrl: z
    .string()
    .url({ message: 'URL không hợp lệ (cần có https://)' })
    .transform((u) => u.replace(/\/$/, '')),
  posts: z
    .array(PostItemSchema)
    .min(1, 'Cần ít nhất 1 bài viết')
    .max(100, 'Tối đa 100 bài một lần'),
});
