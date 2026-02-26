import { getYearsOfExperience } from "../lib/years";
import { t, type Locale } from "../lib/i18n";

export default function AboutSection({ locale = "en" }: { locale?: Locale }) {
  const years = getYearsOfExperience();

  const techGroups = [
    { label: t(locale, "about.tech.frontend"), items: ["React", "Leaflet", "Electron.js"] },
    { label: t(locale, "about.tech.backend"), items: ["Node.js", "Python", "Django"] },
    { label: t(locale, "about.tech.data"), items: ["PostgreSQL", "MySQL", "ClickHouse"] },
    { label: t(locale, "about.tech.infra"), items: ["Docker", "Linux", "DevOps", "Git"] },
  ];

  const stats = [
    { label: t(locale, "about.stat.location"), value: t(locale, "about.stat.locationValue") },
    { label: t(locale, "about.stat.role"), value: t(locale, "about.stat.roleValue") },
    { label: t(locale, "about.stat.experience"), value: t(locale, "about.stat.experienceValue", { years }) },
  ];

  return (
    <section className="relative z-10 border-t border-border/50 py-20 md:py-28">
      <div className="mx-auto grid max-w-5xl gap-10 px-4 md:grid-cols-[280px_1fr] md:gap-16 md:px-6">
        {/* Left — Photo + stats */}
        <div>
          <div className="relative aspect-square w-44 overflow-hidden md:w-full">
            <img
              src="/pp.jpg"
              alt="Güven Değirmenci"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
          </div>

          <div className="mt-6 flex flex-col gap-3">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <span className="text-sm font-medium text-foreground">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Bio */}
        <div>
          <span className="mb-3 block text-xs font-semibold tracking-[0.1em] text-primary uppercase">
            {t(locale, "about.label")}
          </span>
          <h2 className="mb-6 text-3xl font-bold tracking-tight md:text-4xl">
            {t(locale, "about.heading")}
          </h2>

          <p className="mb-4 text-base leading-relaxed text-muted-foreground">
            {t(locale, "about.bio1")}
          </p>
          <p className="mb-8 text-base leading-relaxed text-muted-foreground">
            {t(locale, "about.bio2", { years })}
          </p>

          {/* Tech groups */}
          <span className="mb-4 block text-xs font-medium tracking-[0.1em] text-muted-foreground uppercase">
            {t(locale, "about.techHeading")}
          </span>
          <div className="space-y-3">
            {techGroups.map((group) => (
              <div key={group.label} className="flex items-baseline gap-3">
                <span className="shrink-0 text-xs font-medium text-primary/70 w-16">
                  {group.label}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {group.items.map((tech) => (
                    <span
                      key={tech}
                      className="border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
