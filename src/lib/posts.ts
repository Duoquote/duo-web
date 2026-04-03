const MORE_SEPARATOR = "<!-- more -->";

/**
 * Split a post body on `<!-- more -->` and return the plain-text summary
 * and the remaining markdown body as raw strings.
 */
export function splitPost(body: string) {
  const idx = body.indexOf(MORE_SEPARATOR);
  const summary = (idx === -1 ? body : body.slice(0, idx)).trim();
  const rest = idx === -1 ? "" : body.slice(idx + MORE_SEPARATOR.length).trim();
  return { summary, rest };
}
