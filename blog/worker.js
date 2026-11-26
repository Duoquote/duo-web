// Runs in front of the static assets. It only enforces the one canonical
// origin, https://blog.dq.ms: plain http (Workers custom domains don't redirect
// it on their own) and any other hostname get a 301 to the same path there.
// Everything else is served from blog/dist as is.

const ORIGIN = "blog.dq.ms";

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
    return env.ASSETS.fetch(request);
  },
};
