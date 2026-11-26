import type { APIRoute } from "astro";
import { renderOgPng } from "../lib/og";

export const GET: APIRoute = async () => {
  const png = await renderOgPng({
    title: "Blog",
    eyebrow: "blog.dq.ms",
    footer: "Güven Değirmenci",
  });
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
};
