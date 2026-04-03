import { marked } from "marked";

const MORE_SEPARATOR = "<!-- more -->";

/**
 * Split a post body on `<!-- more -->` and return the excerpt and remaining
 * content as rendered HTML. If no separator exists, the entire body is the
 * excerpt and `restHtml` is empty.
 */
export function splitPost(body: string) {
  const idx = body.indexOf(MORE_SEPARATOR);
  const excerptMd = idx === -1 ? body.trim() : body.slice(0, idx).trim();
  const restMd = idx === -1 ? "" : body.slice(idx + MORE_SEPARATOR.length).trim();

  return {
    excerptHtml: marked.parse(excerptMd) as string,
    restHtml: restMd ? (marked.parse(restMd) as string) : "",
    excerptText: excerptMd.replace(/[#*_`\[\]()>~!|-]/g, "").replace(/\n+/g, " ").trim(),
  };
}
