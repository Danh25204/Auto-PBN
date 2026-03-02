import { z } from 'zod';

export const SiteSchema = z.object({
  url: z
    .string()
    .url({ message: 'Site URL must be a valid URL (include https://)' })
    .transform((u) => u.replace(/\/$/, '')), // strip trailing slash
  username: z.string().min(1, 'Username is required'),
  appPassword: z.string().min(1, 'Application Password is required'),
});

export const PostSchema = z.object({
  title: z.string().min(1, 'Post title is required').max(500),
  content: z.string().min(1, 'Post content is required'),
  status: z.enum(['publish', 'draft']).default('publish'),
});

export const JobRequestSchema = z.object({
  sites: z
    .array(SiteSchema)
    .min(1, 'At least one site is required')
    .transform((sites) => {
      // Deduplicate by URL
      const seen = new Set();
      return sites.filter((s) => {
        if (seen.has(s.url)) return false;
        seen.add(s.url);
        return true;
      });
    }),
  post: PostSchema,
});
