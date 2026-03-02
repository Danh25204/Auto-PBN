import axios from 'axios';
import axiosRetry from 'axios-retry';

const TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT_MS || '15000', 10);
const RETRIES = parseInt(process.env.REQUEST_RETRIES || '2', 10);

// Apply retry logic globally to all axios instances created here
const client = axios.create({ timeout: TIMEOUT });

axiosRetry(client, {
  retries: RETRIES,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (err) =>
    axiosRetry.isNetworkError(err) ||
    (err.response?.status >= 500 && err.response?.status < 600),
});

/**
 * Create a post on a WordPress site using the REST API.
 *
 * @param {object} site   - { url, username, appPassword }
 * @param {object} post   - { title, content, status }
 * @returns {Promise<string>} The published/draft post URL (link)
 */
export async function createWpPost(site, post) {
  const { url, username, appPassword } = site;
  const { title, content, status } = post;

  const apiUrl = `${url}/wp-json/wp/v2/posts`;

  // Basic auth: username:app_password (spaces stripped — WP format is fine either way)
  const token = Buffer.from(`${username}:${appPassword}`).toString('base64');

  const response = await client.post(
    apiUrl,
    { title, content, status },
    {
      headers: {
        Authorization: `Basic ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  // WP returns the post object; `link` is the public URL
  const postUrl = response.data?.link;
  if (!postUrl) throw new Error('WP API returned success but no post link found');

  return postUrl;
}
