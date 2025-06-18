#!/bin/bash

FEED_URLS=(
  "https://thomasvn.dev/feed/"
  "https://jvns.ca/atom.xml"
  "https://golangweekly.com/rss/"
  "https://blog.pragmaticengineer.com/feed/"
  "https://rss.beehiiv.com/feeds/gQxaV1KHkQ.xml"
  "https://world.hey.com/dhh/feed.atom"
  "https://blog.kubecost.com/feed.xml"
  "https://kubernetes.io/feed.xml"
  "https://technicalwriting.dev/rss.xml"
  "https://sive.rs/en.atom"
  "https://matt-rickard.com/rss"
  "https://cybernetist.com/index.xml"
  "https://prometheus.io/blog/feed.xml"
  "https://www.seangoedecke.com/rss.xml"
  "https://www.alexedwards.net/static/feed.rss"
)

for url in "${FEED_URLS[@]}"; do
  echo "Adding feed: $url"
  curl -X GET "https://thomasvn-rss-sub-handler.val.run/add?url=$url" \
       -H "Authorization: Bearer ${API_KEY}"
  echo -e "\n"
done 