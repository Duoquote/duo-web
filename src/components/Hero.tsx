import { FaGithub, FaLinkedinIn } from "react-icons/fa";
import { getYearsOfExperience } from "../lib/years";
import { t, type Locale } from "../lib/i18n";

export default function Hero({ locale = "en" }: { locale?: Locale }) {
  const years = getYearsOfExperience();
  return (
    <section className="relative z-10 flex min-h-svh items-center justify-center text-center">
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        {/* Badge */}
        <div className="mb-8 md:mb-10 flex justify-center">
          <span className="border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium tracking-wide text-primary uppercase">
            {t(locale, "hero.badge")}
          </span>
        </div>

        {/* Big animated logo */}
        <div className="mb-8 md:mb-10 flex justify-center">
          <img
            src="/logo.svg"
            alt="Güven Değirmenci"
            className="block h-36 w-36 sm:h-52 sm:w-52 md:h-72 md:w-72 lg:h-80 lg:w-80 origin-center drop-shadow-[0_0_48px_oklch(0.645_0.246_16.439/30%)] animate-breath"
          />
        </div>

        {/* Subtitle */}
        <p className="mx-auto mb-8 md:mb-10 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {t(locale, "hero.subtitle", { years })}
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="https://github.com/duoquote"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#24292e] px-6 py-2.5 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#2f363d]"
          >
            <FaGithub className="h-4 w-4" />
            GitHub
          </a>
          <a
            href="https://www.linkedin.com/in/duoquote/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#0a66c2] px-6 py-2.5 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#004182]"
          >
            <FaLinkedinIn className="h-4 w-4" />
            LinkedIn
          </a>
        </div>

        {/* Scroll indicator */}
        <div className="mt-10 md:mt-16 flex flex-col items-center gap-2">
          <span className="text-[0.7rem] font-medium tracking-[0.15em] text-muted-foreground uppercase">
            {t(locale, "hero.scroll")}
          </span>
          <div className="h-10 w-px bg-gradient-to-b from-primary/40 to-transparent" />
        </div>
      </div>
    </section>
  );
}
