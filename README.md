# RSS Subscriber

A TypeScript application that checks RSS feeds for new blog posts and sends notifications via webhook.

## Features

- Checks RSS feeds daily for new posts
- Sends webhook notifications when new posts are found
- Deployable to val.town

## Setup

1. Install dependencies:

    ```bash
    npm install
    ```

2. Set up environment variables:

   - WEBHOOK_URL: URL of your webhook endpoint (e.g., Discord webhook, Slack webhook, or custom endpoint)

## Development

Build the project:

```bash
npm run build
```

Run locally:

```bash
npm start
```

## Deployment to val.town

1. Create a new val on val.town
2. Copy the contents of `src/index.ts`
3. Set up the WEBHOOK_URL environment variable in val.town's settings
4. Configure the cron job to run daily

## Usage

The main function `checkAndNotify` takes a feed URL as a parameter and returns a promise that resolves to a status message.

### Webhook Format

The webhook will send a POST request with the following JSON structure:

```json
{
  "text": "New blog posts published today:\n\n- Post Title: Post URL\n- Another Post: Another URL"
}
```
