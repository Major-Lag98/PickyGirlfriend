// Picky Girlfriend Worker: serves the static site + a tiny restaurants API.
// The list lives in KV under a single key so adds persist live for everyone.

const KEY = "list";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/restaurants") {
      if (request.method === "GET") {
        const data = (await env.RESTAURANTS_KV.get(KEY)) ?? "[]";
        return json(data);
      }

      if (request.method === "POST") {
        // If ADMIN_KEY is set as a secret, require it. If unset, the endpoint is open.
        if (env.ADMIN_KEY && request.headers.get("x-admin-key") !== env.ADMIN_KEY) {
          return json({ error: "unauthorized" }, 401);
        }

        let body;
        try {
          body = await request.json();
        } catch {
          return json({ error: "invalid JSON" }, 400);
        }

        const name = String(body.name ?? "").trim();
        const tags = Array.isArray(body.tags)
          ? [...new Set(body.tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean))]
          : [];

        if (!name) return json({ error: "name is required" }, 400);

        const list = JSON.parse((await env.RESTAURANTS_KV.get(KEY)) ?? "[]");
        if (list.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
          return json({ error: `"${name}" is already on the list` }, 409);
        }

        list.push({ name, tags });
        await env.RESTAURANTS_KV.put(KEY, JSON.stringify(list));
        return json({ ok: true, count: list.length, added: { name, tags } }, 201);
      }

      return json({ error: "method not allowed" }, 405);
    }

    // Everything else: serve the static site from /public.
    return env.ASSETS.fetch(request);
  },
};

function json(data, status = 200) {
  const body = typeof data === "string" ? data : JSON.stringify(data);
  return new Response(body, {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
