#!/bin/bash

curl -X GET "https://thomasvn-rss-sub-handler.val.run/get" \
    -H "Authorization: Bearer ${API_KEY}"