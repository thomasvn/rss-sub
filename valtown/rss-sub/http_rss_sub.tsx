import { sqlite } from "https://esm.town/v/std/sqlite";

const API_KEY = Deno.env.get("API_KEY");

export default async function httpHandler(req: Request): Promise<Response> {
  if (!validateApiKey(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const pathname = url.pathname;
  const feedUrl = url.searchParams.get("url");

  await initializeDatabase();

  if (pathname === "/add" && feedUrl) {
    try {
      await sqlite.execute({
        sql: `insert into feed_urls(url) values(?)`,
        args: [feedUrl],
      });
      console.log(`Added URL: ${feedUrl}`);
      return new Response(`URL added: ${feedUrl}`, { status: 200 });
    } catch (error) {
      console.error(`Error adding URL ${feedUrl}:`, error);
      return new Response(`Error adding URL: ${error.message}`, {
        status: 500,
      });
    }
  } else if (pathname === "/delete" && feedUrl) {
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
  } else if (pathname === "/get") {
    try {
      const result = await sqlite.execute({
        sql: `select * from feed_urls`,
        args: [],
      });

      const rows: { id: number; url: string }[] = result.rows.map(
        (row) =>
          Object.fromEntries(
            row.map((value, index) => [result.columns[index], value]),
          ) as any,
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
  } else {
    return new Response("Invalid request", { status: 400 });
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