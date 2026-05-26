# PickyGirlfriend

"IDK what I want to eat"

Have fate choose for her.

A spin-the-wheel restaurant picker. A single Cloudflare Worker serves the site
(`public/`) and a tiny API backed by Workers KV, so restaurants you add show up
live for everyone — no editing JSON or redeploying.

## How adding works

- The site fetches the list from `GET /api/restaurants`.
- The **Add a spot** panel posts `{ name, tags }` to `POST /api/restaurants`,
  which appends to the KV-stored list and refreshes the wheel.
- `restaurants.json` is now only the one-time seed for KV.

## Setup (one time)

Requires a free Cloudflare account.

```sh
# 1. Log in
npx wrangler login

# 2. Create the KV namespace, then paste the printed id into wrangler.jsonc
npx wrangler kv namespace create RESTAURANTS_KV

# 3. Seed it with the existing restaurants
npx wrangler kv key put list --path=restaurants.json --binding=RESTAURANTS_KV --remote

# 4. (Optional) Require a key for adds so randoms can't spam the list
npx wrangler secret put ADMIN_KEY
#    The site prompts for this key the first time you add, then remembers it.

# 5. Deploy
npx wrangler deploy
```

## Local development

```sh
# Seed the LOCAL kv store once, then run the dev server
npx wrangler kv key put list --path=restaurants.json --binding=RESTAURANTS_KV --local
npx wrangler dev
```
