import { email } from "https://esm.town/v/std/email";
import { sqlite } from "https://esm.town/v/std/sqlite";
import { parseFeed } from "https://deno.land/x/rss@1.1.2/mod.ts";

interface BlogPost {
  title: string;
  link: string;
  pubDate: string;
  content: string;
}

const HOURS_24_MS = 48 * 60 * 60 * 1000;

export async function checkAllFeeds() {
  const feeds = await getStoredFeedUrls();
  const cutoffDate = new Date(Date.now() - HOURS_24_MS);

  console.log(
    `🔍 Checking ${
      feeds.length
    } RSS feeds for posts since ${cutoffDate.toISOString()}`
  );

  let totalRecentPosts = 0;
  for (const url of feeds) {
    const { recentPosts, feedTitle } = await parseFeedFromUrl(url, cutoffDate);
    if (recentPosts.length > 0) {
      await sendEmailNotifications(recentPosts, feedTitle);
    }
    totalRecentPosts += recentPosts.length;
  }

  console.log(
    `📊 Found ${totalRecentPosts} recent posts from ${feeds.length} feeds`
  );
}

// All feeds are stored in the valtown sqlite database. GET/ADD/DELETE are
// handled by the http_rss_sub.tsx file.
async function getStoredFeedUrls(): Promise<string[]> {
  const result = await sqlite.execute({
    sql: "SELECT url FROM feed_urls",
    args: [],
  });
  return result.rows.map((row) => row[0] as string);
}

async function parseFeedFromUrl(
  feedUrl: string,
  cutoffDate: Date
): Promise<{ recentPosts: BlogPost[]; feedTitle: string }> {
  try {
    const response = await fetch(feedUrl);
    const xml = await response.text();
    const feed = await parseFeed(xml);
    const feedTitle = feed.title?.value || feed.title || feedUrl;
    const entries = feed.entries || [];

    const recentPosts = entries
      .map((entry) => ({
        title: entry.title?.value || entry.title || "",
        link: entry.links[0]?.href || "",
        pubDate: entry.publishedRaw || entry.published?.toISOString() || "",
        content:
          entry.content?.value ||
          entry.description?.value ||
          entry.description ||
          "",
      }))
      .filter((post) => new Date(post.pubDate) >= cutoffDate);

    if (recentPosts.length > 0) {
      console.log(
        `📰 ${feedUrl}: ${recentPosts.length}/${entries.length} recent posts`
      );
    }

    return { recentPosts, feedTitle };
  } catch (error) {
    console.error(`❌ Error checking ${feedUrl}:`, error.message);
    return { recentPosts: [], feedTitle: feedUrl };
  }
}

async function sendEmailNotifications(posts: BlogPost[], feedTitle: string) {
  for (const post of posts) {
    await email({
      subject: `${feedTitle}: ${post.title}`,
      text: `${post.link}\n\n${post.content}`,
    });
  }
}
