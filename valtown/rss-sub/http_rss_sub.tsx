import { sqlite } from "https://esm.town/v/std/sqlite";
import { parseFeed } from "https://deno.land/x/rss@1.1.2/mod.ts";

const API_KEY = Deno.env.get("API_KEY");

interface BlogPost {
  title: string;
  link: string;
  pubDate: string;
  feedUrl: string;
  timestamp: number;
}

export default async function httpHandler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const feedUrl = url.searchParams.get("url");

  await initializeDatabase();

  switch (pathname) {
    case "/add":
      if (!validateApiKey(req)) {
        return new Response("Unauthorized", { status: 401 });
      }
      return await handleAdd(feedUrl);
    case "/delete":
      if (!validateApiKey(req)) {
        return new Response("Unauthorized", { status: 401 });
      }
      return await handleDelete(feedUrl);
    case "/get":
      return await handleGet();
    case "/getBlogPosts7d":
      return await handleGetBlogPosts7d();
    default:
      return new Response("Invalid request", { status: 400 });
  }
}

async function handleAdd(feedUrl: string | null): Promise<Response> {
  if (!feedUrl) {
    return new Response("URL parameter required", { status: 400 });
  }

  try {
    await sqlite.execute({
      sql: `insert into feed_urls(url) values(?)`,
      args: [feedUrl],
    });
    console.log(`Added URL: ${feedUrl}`);
    return new Response(`URL added: ${feedUrl}`, { status: 200 });
  } catch (error) {
    console.error(`Error adding URL ${feedUrl}:`, error);
    return new Response(`Error adding URL: ${error.message}`, { status: 500 });
  }
}

async function handleDelete(feedUrl: string | null): Promise<Response> {
  if (!feedUrl) {
    return new Response("URL parameter required", { status: 400 });
  }

  try {
    await sqlite.execute({
      sql: `delete from feed_urls where url = ?`,
      args: [feedUrl],
    });
    console.log(`Deleted URL: ${feedUrl}`);
    return new Response(`URL deleted: ${feedUrl}`, { status: 200 });
  } catch (error) {
    console.error(`Error deleting URL ${feedUrl}:`, error);
    return new Response(`Error deleting URL: ${error.message}`, {
      status: 500,
    });
  }
}

async function handleGet(): Promise<Response> {
  try {
    const result = await sqlite.execute({
      sql: `select * from feed_urls`,
      args: [],
    });

    const rows: { id: number; url: string }[] = result.rows.map(
      (row) =>
        Object.fromEntries(
          row.map((value, index) => [result.columns[index], value])
        ) as any
    );

    console.log("Retrieved URLs:", rows);
    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error retrieving URLs:", error);
    return new Response(`Error retrieving URLs: ${error.message}`, {
      status: 500,
    });
  }
}

async function handleGetBlogPosts7d(): Promise<Response> {
  try {
    const feeds = await getAllFeeds();
    const sevenDaysAgoTime = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).getTime();

    const results = await Promise.all(
      feeds.map(async (url) => {
        try {
          const response = await fetch(url);
          const xml = await response.text();
          return await extractPostsLast7Days(xml, url, sevenDaysAgoTime);
        } catch (error) {
          console.error(`Error fetching ${url}:`, error);
          return [];
        }
      })
    );

    const allPosts = results.flat().sort((a, b) => b.timestamp - a.timestamp);

    return new Response(JSON.stringify(allPosts), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error retrieving blog posts:", error);
    return new Response(`Error retrieving blog posts: ${error.message}`, {
      status: 500,
    });
  }
}

async function getAllFeeds(): Promise<string[]> {
  const result = await sqlite.execute({
    sql: `select url from feed_urls`,
    args: [],
  });

  return result.rows.map((row) => row[0] as string);
}

async function extractPostsLast7Days(
  xml: string,
  feedUrl: string,
  sevenDaysAgoTime: number
): Promise<BlogPost[]> {
  try {
    const feed = await parseFeed(xml);
    const posts: BlogPost[] = [];

    for (const entry of feed.entries || []) {
      const postDate = new Date(entry.published || entry.publishedRaw || "");
      const timestamp = postDate.getTime();

      // Filter posts from the last 7 days
      if (timestamp >= sevenDaysAgoTime) {
        posts.push({
          title: entry.title?.value || entry.title || "",
          link: entry.links[0]?.href || "",
          pubDate: entry.publishedRaw || entry.published?.toISOString() || "",
          feedUrl: feedUrl,
          timestamp: timestamp,
        });
      }
    }

    return posts;
  } catch (error) {
    console.error(`⚠️ RSS parsing error for ${feedUrl}:`, error.message);
    return [];
  }
}

function validateApiKey(req: Request): boolean {
  const authHeader = req.headers.get("Authorization");
  return authHeader === `Bearer ${API_KEY}`;
}

async function initializeDatabase() {
  await sqlite.execute(`create table if not exists feed_urls(
      id integer primary key autoincrement,
      url text unique
    )`);
}

function stripCDATA(text: string): string {
  return text.replace(/^<!\[CDATA\[|\]\]>$/g, "").trim();
}
