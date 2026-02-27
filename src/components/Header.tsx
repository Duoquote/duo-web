import { useState, useEffect } from "react";
import { Sun, Moon, Github } from "lucide-react";
import { t, getLocalizedPath, type Locale } from "../lib/i18n";

function getIsDark() {
  if (typeof document === "undefined") return true;
  return document.documentElement.classList.contains("dark");
}

export default function Header({ locale = "en" }: { locale?: Locale }) {
  const [dark, setDark] = useState(getIsDark);

  useEffect(() => {
    // Sync state if the inline script already set the class
    setDark(getIsDark());
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  const navItems = [
    { label: t(locale, "nav.home"), href: getLocalizedPath(locale, "/") },
    { label: t(locale, "nav.tools"), href: getLocalizedPath(locale, "/tools") },
    { label: t(locale, "nav.links"), href: getLocalizedPath(locale, "/links") },
  ];

  const currentPath =
    typeof window !== "undefined" ? window.location.pathname : "/";
  const switchPath = getLocalizedPath(
    locale === "en" ? "tr" : "en",
    currentPath,
  );

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-12 max-w-5xl items-center gap-3 sm:gap-6 px-4 md:px-6">
        <a
          href={getLocalizedPath(locale, "/")}
          className="flex items-center gap-2 shrink-0"
        >
          <img src="/logo.svg" alt="Logo" className="h-6 w-6" />
          <span className="hidden sm:block text-sm font-semibold tracking-tight text-foreground">
            Güven Değirmenci
          </span>
        </a>

        <div className="flex items-center gap-1">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 text-sm font-medium text-muted-foreground no-underline decoration-transparent transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <a
            href="https://github.com/Duoquote/duo-web"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-muted-foreground border border-border transition-colors hover:text-foreground hover:border-primary/30"
            aria-label="GitHub"
          >
            <Github className="h-3.5 w-3.5" />
          </a>
          <button
            onClick={toggleTheme}
            className="p-1.5 text-muted-foreground border border-border transition-colors hover:text-foreground hover:border-primary/30 cursor-pointer"
            aria-label="Toggle theme"
          >
            {dark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <a
            href={switchPath}
            className="px-2.5 py-1 text-xs font-semibold tracking-wide text-muted-foreground border border-border transition-colors hover:text-foreground hover:border-primary/30"
            title={t(locale, "lang.switchLabel")}
          >
            {t(locale, "lang.switch")}
          </a>
        </div>
      </nav>
    </header>
  );
}
