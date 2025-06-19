import { email } from "https://esm.town/v/std/email";
import { sqlite } from "https://esm.town/v/std/sqlite";

interface BlogPost {
  title: string;
  link: string;
  pubDate: string;
}

export async function checkAllFeeds() {
  const feeds = await getAllFeeds();
  for (const url of feeds) {
    console.log("Checking feed:", url);
    await fetchFeedAndNotify(url);
  }
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

async function fetchFeedAndNotify(feedUrl: string) {
  try {
    const response = await fetch(feedUrl);
    const xml = await response.text();
    const newPosts = extractTodaysPosts(xml);

    if (newPosts.length > 0) {
      await sendEmailNotification(newPosts, feedUrl);
      console.log(
        `Found ${newPosts.length} new posts and sent email for ${feedUrl}`
      );
    } else {
      console.log(`No new posts today for ${feedUrl}`);
    }
  } catch (error) {
    console.error(`Error checking ${feedUrl}:`, error);
  }
}

function extractTodaysPosts(xml: string): BlogPost[] {
  // Simple XML parsing using regex (since we only need basic fields)
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return items
    .map((item) => {
      const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
      const dateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);

      return {
        title: titleMatch ? titleMatch[1].trim() : "",
        link: linkMatch ? linkMatch[1].trim() : "",
        pubDate: dateMatch ? dateMatch[1].trim() : "",
      };
    })
    .filter((post) => {
      const postDate = new Date(post.pubDate);
      postDate.setHours(0, 0, 0, 0);
      return postDate.getTime() === today.getTime();
    });
}

async function sendEmailNotification(posts: BlogPost[], feedUrl: string) {
  for (const post of posts) {
    await email({
      subject: `${post.title} - from ${feedUrl}`,
      text: post.link,
    });
  }
}
