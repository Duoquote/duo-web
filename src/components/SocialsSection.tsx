import { t, type Locale } from "../lib/i18n";

// Obfuscated to prevent spam bots from scraping
const emailUser = "guven";
const emailDomain = "dq.ms";

const commands = [
  { prompt: "$ whoami", response: "güven değirmenci" },
  {
    prompt: "$ contact --email",
    obfuscatedEmail: true,
  },
  {
    prompt: "$ socials --list",
    links: [
      { label: "github", href: "https://github.com/duoquote" },
      { label: "linkedin", href: "https://www.linkedin.com/in/duoquote/" },
      { label: "stackoverflow", href: "https://stackoverflow.com/users/7493063/guven-degirmenci" },
      { label: "instagram", href: "https://www.instagram.com/duoquote/" },
    ],
  },
];

export default function SocialsSection({ locale = "en" }: { locale?: Locale }) {
  return (
    <footer className="relative z-10 border-t border-border/50 py-16 md:py-24">
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        {/* Terminal card */}
        <div className="mx-auto max-w-xl border border-border bg-card">
          {/* Title bar */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            <span className="ml-2 text-xs text-muted-foreground/60 font-mono">
              contact.sh
            </span>
          </div>

          {/* Terminal body */}
          <div className="p-5 font-mono text-sm leading-relaxed space-y-4">
            {commands.map((cmd, i) => (
              <div key={i}>
                <div className="text-muted-foreground">{cmd.prompt}</div>
                {"obfuscatedEmail" in cmd && (
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      window.location.href = `mailto:${emailUser}@${emailDomain}`;
                    }}
                    className="text-primary no-underline hover:text-primary/80 transition-colors"
                  >
                    {">"} {emailUser}&#64;{emailDomain}
                  </a>
                )}
                {"response" in cmd && (
                  <div className="text-foreground">{">"} {cmd.response}</div>
                )}
                {"links" in cmd && (
                  <div className="flex flex-wrap gap-x-2">
                    <span className="text-foreground">{">"}</span>
                    {cmd.links.map((link, j) => (
                      <span key={link.label}>
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary no-underline hover:text-primary/80 transition-colors"
                        >
                          {link.label}
                        </a>
                        {j < cmd.links.length - 1 && (
                          <span className="text-muted-foreground"> · </span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Blinking cursor */}
            <div className="flex items-center gap-1 text-muted-foreground">
              $ <span className="inline-block w-2 h-4 bg-primary/70 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Footer bar */}
        <div className="mt-12 flex items-center justify-center">
          <span className="text-xs text-muted-foreground">
            {t(locale, "footer.copyright", { year: new Date().getFullYear() })}
          </span>
        </div>
      </div>
    </footer>
  );
}
