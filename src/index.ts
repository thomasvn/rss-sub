import { email } from "https://esm.town/v/std/email";

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

function checkNewPosts(xml: string): BlogPost[] {
  // Simple XML parsing using regex (since we only need basic fields)
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

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
      return postDate >= weekAgo && postDate <= today;
    });
}

async function sendEmailNotification(posts: BlogPost[], feedUrl: string) {
  const message = posts
    .map((post) => `- ${post.title}: ${post.link}`)
    .join("\n");

  await email({
    subject: `New blog posts from ${feedUrl}`,
    text: `New blog posts published this week:\n\n${message}`,
  });
}

async function checkAndNotify(feedUrl: string) {
  try {
    const response = await fetch(feedUrl);
    const xml = await response.text();
    const newPosts = checkNewPosts(xml);

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

export async function checkAllFeeds() {
  for (const url of FEED_URLS) {
    console.log("Checking feed:", url);
    await checkAndNotify(url);
  }
}

checkAllFeeds().catch(console.error);
