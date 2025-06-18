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

export async function checkAllFeeds() {
  for (const url of FEED_URLS) {
    console.log("Checking feed:", url);
    await getFeedAndEmailUpdate(url);
  }
}

async function getFeedAndEmailUpdate(feedUrl: string) {
  try {
    const response = await fetch(feedUrl);
    const xml = await response.text();
    const newPosts = parseForTodaysPosts(xml);

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

function parseForTodaysPosts(xml: string): BlogPost[] {
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
