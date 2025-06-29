# Setup

## Prerequisites

- [Val.town account](https://www.val.town/)
- `git`, `brew`

## Deploy

```bash
# Clone this repo
git clone https://github.com/thomasvn/rss-sub.git
cd rss-sub

# Install ValTown CLI
brew install deno
deno install -grAf jsr:@valtown/vt

# Deploy to Val.town
cd valtown
vt create rss-subscriber
cp rss-sub/*.tsx rss-subscriber
cd rss-subscriber
vt push
```

In the Val.town UI:

1. Set `API_KEY` environment variable for authentication
2. Update cron schedule (default: hourly → daily)
3. (Optional) Rename HTTP endpoint

## Usage

Set environment variables:

```bash
export VALTOWN_ENDPOINT="username-randomstring.web.val.run"
export API_KEY="your-api-key"
export FEED="https://example.com/feed/"
```

**Add feed:**

```bash
curl -X GET "https://${VALTOWN_ENDPOINT}/add?url=${FEED}" \
    -H "Authorization: Bearer ${API_KEY}"
```

**Remove feed:**

```bash
curl -X GET "https://${VALTOWN_ENDPOINT}/delete?url=${FEED}" \
    -H "Authorization: Bearer ${API_KEY}"
```

**List feeds:**

```bash
curl -X GET "https://${VALTOWN_ENDPOINT}/get" \
    -H "Authorization: Bearer ${API_KEY}"
```
