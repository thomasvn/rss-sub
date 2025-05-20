interface BlogPost {
  title: string;
  link: string;
  pubDate: string;
}

const FEED_URLS = [
  "https://thomasvn.dev/feed/",
  "https://jvns.ca/atom.xml",
  "https://golangweekly.com/rss/",
  "https://blog.pragmaticengineer.com/feed/",
  "https://rss.beehiiv.com/feeds/gQxaV1KHkQ.xml",
  "https://world.hey.com/dhh/feed.atom",
  "https://blog.kubecost.com/feed.xml",
  "https://kubernetes.io/feed.xml",
  "https://technicalwriting.dev/rss.xml",
  "https://sive.rs/en.atom",
  "https://matt-rickard.com/rss",
  "https://cybernetist.com/index.xml",
  "https://prometheus.io/blog/feed.xml",
  "https://www.seangoedecke.com/rss.xml",
  "https://www.alexedwards.net/static/feed.rss",
];

async function checkNewPosts(feedUrl: string): Promise<BlogPost[]> {
  const response = await fetch(feedUrl);
  const xml = await response.text();

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

async function sendWebhookNotification(posts: BlogPost[], feedUrl: string) {
  const webhookUrl = process.env.WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("WEBHOOK_URL environment variable is not set");
  }

  const message = posts
    .map((post) => `- ${post.title}: ${post.link}`)
    .join("\n");

  await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: `New blog posts published today for feed: ${feedUrl}\n\n${message}`,
    }),
  });
}

export async function checkAndNotify(feedUrl: string) {
  try {
    const newPosts = await checkNewPosts(feedUrl);
    if (newPosts.length > 0) {
      await sendWebhookNotification(newPosts, feedUrl);
      return `Found ${newPosts.length} new posts and sent notification for ${feedUrl}`;
    }
    return `No new posts today for ${feedUrl}`;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

export async function checkAllFeeds() {
  const results = [];
  for (const url of FEED_URLS) {
    try {
      const result = await checkAndNotify(url);
      results.push({ url, result });
    } catch (error) {
      results.push({ url, result: `Error: ${error}` });
    }
  }
  return results;
}
