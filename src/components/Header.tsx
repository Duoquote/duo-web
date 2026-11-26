import { useState, useEffect } from "react";
import { Sun, Moon, Github, Menu, X } from "lucide-react";
import { t, getLocalizedPath, type Locale } from "../lib/i18n";

function getIsDark() {
  if (typeof document === "undefined") return true;
  return document.documentElement.classList.contains("dark");
}

function getIsRetro() {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("retro");
}

export default function Header({ locale = "en" }: { locale?: Locale }) {
  const [dark, setDark] = useState(getIsDark);
  const [retro, setRetro] = useState(getIsRetro);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // Sync state if the inline script already set the class
    setDark(getIsDark());
    setRetro(getIsRetro());
  }, []);

  // Close the mobile menu on Escape, and when the viewport grows past md
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    const mq = window.matchMedia("(min-width: 768px)");
    const onResize = () => mq.matches && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onResize);
    };
  }, [menuOpen]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  function toggleRetro() {
    const next = !retro;
    setRetro(next);
    document.documentElement.classList.toggle("retro", next);
    localStorage.setItem("retro", next ? "1" : "0");
    // let <RetroDecor /> know without a full reload
    window.dispatchEvent(new Event("retrochange"));
  }

  const navItems = [
    { label: t(locale, "nav.home"), href: getLocalizedPath(locale, "/") },
    { label: t(locale, "nav.tools"), href: getLocalizedPath(locale, "/tools") },
    { label: t(locale, "nav.links"), href: getLocalizedPath(locale, "/links") },
    // separate site, English only
    { label: t(locale, "nav.blog"), href: "https://blog.dq.ms" },
  ];

  const currentPath =
    typeof window !== "undefined" ? window.location.pathname : "/";
  const switchPath = getLocalizedPath(
    locale === "en" ? "tr" : "en",
    currentPath,
  );

  const iconButton =
    "p-1.5 text-muted-foreground border border-border transition-colors hover:text-foreground hover:border-primary/30 cursor-pointer";

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-12 max-w-5xl items-center gap-3 md:gap-6 px-4 md:px-6">
        <a
          href={getLocalizedPath(locale, "/")}
          className="flex items-center gap-2 shrink-0"
        >
          <img src="/logo.svg" alt="Logo" className="h-6 w-6" />
          {/* room for the name on small tablets (menu mode) and on wide screens, not in between */}
          <span className="hidden sm:block md:hidden lg:block text-sm font-semibold tracking-tight text-foreground">
            Güven Değirmenci
          </span>
        </a>

        {/* inline nav from md up; below that it lives in the menu */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground no-underline decoration-transparent transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <a
            href="https://github.com/Duoquote/duo-web"
            target="_blank"
            rel="noopener noreferrer"
            className={`hidden md:block ${iconButton}`}
            aria-label="GitHub"
          >
            <Github className="h-3.5 w-3.5" />
          </a>
          <button
            onClick={toggleTheme}
            className={iconButton}
            aria-label="Toggle theme"
          >
            {dark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button
            onClick={toggleRetro}
            className="retro-toggle px-2 py-1 text-[11px] font-bold tracking-wide text-muted-foreground border border-border transition-colors hover:text-foreground hover:border-primary/30 cursor-pointer"
            title={t(locale, retro ? "retro.exit" : "retro.enter")}
            aria-pressed={retro}
          >
            2005
          </button>
          <a
            href={switchPath}
            className="px-2.5 py-1 text-xs font-semibold tracking-wide text-muted-foreground border border-border transition-colors hover:text-foreground hover:border-primary/30"
            title={t(locale, "lang.switchLabel")}
          >
            {t(locale, "lang.switch")}
          </a>
          <button
            onClick={() => setMenuOpen((open) => !open)}
            className={`md:hidden ${iconButton}`}
            aria-label={t(locale, menuOpen ? "nav.menuClose" : "nav.menu")}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
          >
            {menuOpen ? <X size={14} /> : <Menu size={14} />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div id="mobile-nav" className="md:hidden border-t border-border/50">
          <ul className="mx-auto max-w-5xl px-2 py-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="block px-2 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="https://github.com/Duoquote/duo-web"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-2 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Github className="h-3.5 w-3.5" />
                GitHub
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
