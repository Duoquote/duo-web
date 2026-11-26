// Runs in front of the static assets in blog/dist. It does three small things:
//
// 1. One canonical origin. Plain http (Workers custom domains don't redirect it
//    on their own) and any other hostname get a 301 to https://blog.dq.ms.
// 2. One URL per page. /post/ and /post.html get a 301 to /post. The assets
//    layer would answer these with a 307, which search engines treat as
//    temporary.
// 3. Markdown on request. A client that asks for text/markdown (Accept header)
//    gets /post.md instead of /post, and / gets /llms.txt. The .md files carry
//    a Link header pointing at the HTML page as canonical.

const ORIGIN = "blog.dq.ms";

/** @param {Request} request */
function wantsMarkdown(request) {
  const accept = request.headers.get("Accept") || "";
  // browsers send text/html first; only switch when markdown is asked for explicitly
  return /text\/markdown/i.test(accept) && !/text\/html/i.test(accept.split(",")[0] || "");
}

/** @param {Response} response @param {Record<string, string>} headers */
function withHeaders(response, headers) {
  const out = new Response(response.body, response);
  for (const [key, value] of Object.entries(headers)) out.headers.set(key, value);
  return out;
}

export default {
  /** @param {Request} request @param {{ ASSETS: { fetch: typeof fetch } }} env */
  async fetch(request, env) {
    const url = new URL(request.url);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";

    if (!local && (url.protocol !== "https:" || url.hostname !== ORIGIN)) {
      url.protocol = "https:";
      url.hostname = ORIGIN;
      url.port = "";
      return Response.redirect(url.toString(), 301);
    }

    const { pathname } = url;
    let clean = pathname;
    if (clean.endsWith("/index.html")) clean = clean.slice(0, -"index.html".length);
    else if (clean.endsWith(".html")) clean = clean.slice(0, -".html".length);
    if (clean.length > 1 && clean.endsWith("/")) clean = clean.replace(/\/+$/, "") || "/";
    if (clean !== pathname) {
      url.pathname = clean;
      return Response.redirect(url.toString(), 301);
    }

    const isPage = pathname === "/" || !/\.[a-z0-9]+$/i.test(pathname);

    if (isPage && wantsMarkdown(request)) {
      const mdPath = pathname === "/" ? "/llms.txt" : `${pathname}.md`;
      const md = await env.ASSETS.fetch(new Request(new URL(mdPath, url), request));
      if (md.ok) {
        return withHeaders(md, {
          "Content-Type": "text/markdown; charset=utf-8",
          Link: `<https://${ORIGIN}${pathname}>; rel="canonical"`,
          Vary: "Accept",
        });
      }
    }

    const response = await env.ASSETS.fetch(request);

    if (pathname.endsWith(".md") && response.ok) {
      return withHeaders(response, {
        "Content-Type": "text/markdown; charset=utf-8",
        Link: `<https://${ORIGIN}${pathname.slice(0, -3)}>; rel="canonical"`,
      });
    }
    if (isPage) return withHeaders(response, { Vary: "Accept" });
    return response;
  },
};
