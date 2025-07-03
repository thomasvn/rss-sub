import { email } from "https://esm.town/v/std/email";
import { sqlite } from "https://esm.town/v/std/sqlite";
import { parseFeed } from "https://deno.land/x/rss@1.1.2/mod.ts";

interface BlogPost {
  title: string;
  link: string;
  pubDate: string;
}

export async function checkAllFeeds() {
  const feeds = await getAllFeeds();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  console.log(`\n🔍 Checking ${feeds.length} RSS feeds for recent posts...\n`);
  console.log(
    `📅 Recent posts window: ${twentyFourHoursAgo.toISOString()} to ${new Date().toISOString()}\n`
  );

  console.log(`📋 Feeds to check:`);
  feeds.forEach((feed, index) => console.log(`   ${index + 1}. ${feed}`));
  console.log();

  let totalRecentPosts = 0;
  for (const url of feeds) {
    const recentPosts = await fetchFeedAndNotify(url, twentyFourHoursAgo);
    totalRecentPosts += recentPosts;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   • Total feeds checked: ${feeds.length}`);
  console.log(`   • Recent posts found: ${totalRecentPosts}\n`);
}

// All feeds are stored in the valtown sqlite database. GET/ADD/DELETE are
// handled by the http_rss_sub.tsx file.
async function getAllFeeds(): Promise<string[]> {
  const result = await sqlite.execute({
    sql: `select url from feed_urls`,
    args: [],
  });
  return result.rows.map((row) => row[0] as string);
}

async function fetchFeedAndNotify(
  feedUrl: string,
  twentyFourHoursAgo: Date
): Promise<number> {
  try {
    const response = await fetch(feedUrl);
    const xml = await response.text();
    const recentPosts = await extractRecentPosts(
      xml,
      feedUrl,
      twentyFourHoursAgo
    );

    if (recentPosts.length > 0) {
      await sendEmailNotification(recentPosts, feedUrl);
      console.log(
        `✅ Found ${recentPosts.length} recent post${
          recentPosts.length > 1 ? "s" : ""
        } from ${feedUrl}`
      );
    }

    return recentPosts.length;
  } catch (error) {
    console.error(`❌ Error checking ${feedUrl}:`, error.message);
    return 0;
  }
}

// Parse RSS feed using rss library
async function extractRecentPosts(
  xml: string,
  feedUrl: string,
  twentyFourHoursAgo: Date
): Promise<BlogPost[]> {
  try {
    const feed = await parseFeed(xml);
    const recentPosts: BlogPost[] = [];
    let totalPosts = 0;

    for (const entry of feed.entries || []) {
      totalPosts++;
      const postDate = new Date(entry.published || entry.publishedRaw || "");

      if (postDate >= twentyFourHoursAgo) {
        recentPosts.push({
          title: entry.title?.value || entry.title || "",
          link: entry.links[0]?.href || "",
          pubDate: entry.publishedRaw || entry.published?.toISOString() || "",
        });
      }
    }

    if (recentPosts.length > 0) {
      console.log(
        `   📰 Found ${totalPosts} total posts, ${recentPosts.length} recent`
      );
      recentPosts.forEach((post) => {
        console.log(`      • "${post.title}" (${post.pubDate})`);
      });
    }

    return recentPosts;
  } catch (error) {
    console.error(`   ⚠️  RSS parsing error for ${feedUrl}:`, error.message);
    return [];
  }
}

async function sendEmailNotification(posts: BlogPost[], feedUrl: string) {
  for (const post of posts) {
    await email({
      subject: `${post.title} - from ${feedUrl}`,
      text: post.link,
    });
  }
}
