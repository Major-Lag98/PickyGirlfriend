// Picky Girlfriend Worker: serves the static site + a tiny restaurants API.
// The list lives in KV under a single key so adds persist live for everyone.

const KEY = "list";

// Origins allowed to call the API from a browser (CORS). The GitHub Pages
// frontend is cross-origin; the workers.dev site is same-origin but harmless here.
const ALLOWED_ORIGINS = new Set([
  "https://major-lag98.github.io",
  "https://pickygirlfriend.aldensmith06.workers.dev",
]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    if (url.pathname === "/api/restaurants") {
      // CORS preflight for the admin-key POST.
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: cors(origin) });
      }

      if (request.method === "GET") {
        const data = (await env.RESTAURANTS_KV.get(KEY)) ?? "[]";
        return json(data, 200, origin);
      }

      if (request.method === "POST") {
        // If ADMIN_KEY is set as a secret, require it. If unset, the endpoint is open.
        if (env.ADMIN_KEY && request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
          return json({ error: "unauthorized" }, 401, origin);
        }

        let body;
        try {
          body = await request.json();
        } catch {
          return json({ error: "invalid JSON" }, 400, origin);
        }

        const name = String(body.name ?? "").trim();
        const tags = Array.isArray(body.tags)
          ? [...new Set(body.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean))]
          : [];

        if (!name) return json({ error: "name is required" }, 400, origin);

        const list = JSON.parse((await env.RESTAURANTS_KV.get(KEY)) ?? "[]");
        if (list.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
          return json({ error: `"${name}" is already on the list` }, 409, origin);
        }

        list.push({ name, tags });
        await env.RESTAURANTS_KV.put(KEY, JSON.stringify(list));
        return json({ ok: true, count: list.length, added: { name, tags } }, 201, origin);
      }

      return json({ error: "method not allowed" }, 405, origin);
    }

    // Everything else: serve the static site from /docs.
    return env.ASSETS.fetch(request);
  },
};

function cors(origin) {
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-admin-key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function json(data, status = 200, origin = null) {
  const body = typeof data === "string" ? data : JSON.stringify(data);
  return new Response(body, {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...cors(origin),
    },
  });
}
