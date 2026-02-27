export type Locale = "en" | "tr";

const translations = {
  en: {
    // Nav
    "nav.home": "Home",
    "nav.tools": "Tools",

    // Hero
    "hero.badge": "Managing Partner @ Next Geo",
    "hero.subtitle":
      "Full-stack developer with {years}+ years building AI-powered location analytics platforms, GIS systems, and developer tools. Managing Partner at Next Geo.",
    "hero.scroll": "Scroll",

    // About
    "about.label": "About",
    "about.heading": "A brief intro.",
    "about.bio1":
      "I'm Güven Değirmenci — born in Kırklareli in 2000. After graduating from Düvenciler Anatolian High School in 2018, I studied Translation and Interpreting at Kırklareli University while simultaneously building my career in software engineering.",
    "about.bio2":
      "I joined Next Geo as a Software Developer in 2020 and grew into the Managing Partner role by 2022. Over the past {years}+ years, I've been building AI-powered location analytics platforms, GIS systems, and developer tooling.",
    "about.techHeading": "Technologies I work with",
    "about.stat.location": "Location",
    "about.stat.locationValue": "Istanbul, Türkiye",
    "about.stat.role": "Role",
    "about.stat.roleValue": "Managing Partner",
    "about.stat.experience": "Experience",
    "about.stat.experienceValue": "{years}+ years",
    "about.tech.frontend": "Frontend",
    "about.tech.backend": "Backend",
    "about.tech.data": "Data",
    "about.tech.infra": "Infra",

    // Footer
    "footer.copyright": "© {year} Güven Değirmenci",

    // Tools page
    "tools.label": "Tools",
    "tools.heading": "Developer utilities.",
    "tools.description": "Small tools I built for myself. Feel free to use them.",
    "tools.h3.name": "H3 Explorer",
    "tools.h3.description": "Visualize H3 hex cells on an interactive map.",

    // Converter tool listing
    "tools.converter.name": "Video Converter",
    "tools.converter.description":
      "Convert video and audio files in your browser.",

    // H3 Explorer
    "h3.backToTools": "← Back to tools",
    "h3.heading": "H3 Explorer",
    "h3.description": "Enter an H3 hex index to visualize the cell on the map.",
    "h3.placeholder": "e.g. 8928308280fffff",
    "h3.placeholderDecimal": "e.g. 622236750694711295",
    "h3.errorEmpty": "Enter an H3 index",
    "h3.errorInvalid": "Invalid H3 index",

    // Converter
    "converter.backToTools": "← Back to tools",
    "converter.heading": "Video Converter",
    "converter.description":
      "Convert video and audio files entirely in your browser. No upload, no server.",
    "converter.dropzone": "Drop a file here or click to browse",
    "converter.dropzoneActive": "Drop it!",
    "converter.fileSize": "Size",
    "converter.fileType": "Type",
    "converter.fileSizeWarning":
      "Files over 50 MB may cause performance issues or fail.",
    "converter.outputFormat": "Output format",
    "converter.codec": "Codec",
    "converter.quality": "Quality",
    "converter.balanced": "Balanced",
    "converter.small": "Small",
    "converter.custom": "Custom",
    "converter.advanced": "Advanced settings",
    "converter.rateControl": "Rate control",
    "converter.crf": "CRF",
    "converter.videoBitrate": "Video bitrate",
    "converter.audioBitrate": "Audio bitrate",
    "converter.scale": "Scale",
    "converter.frameRate": "Frame rate",
    "converter.audioCodec": "Audio codec",
    "converter.sampleRate": "Sample rate",
    "converter.channels": "Channels",
    "converter.keepOriginal": "Keep original",
    "converter.mono": "Mono",
    "converter.stereo": "Stereo",
    "converter.none": "None",
    "converter.copy": "Copy (no re-encode)",
    "converter.convert": "Convert",
    "converter.converting": "Converting...",
    "converter.cancel": "Cancel",
    "converter.loadingFfmpeg": "Loading FFmpeg...",
    "converter.download": "Download",
    "converter.outputSize": "Output size",
    "converter.error": "Conversion failed",
    "converter.convertAnother": "Convert another",
    "converter.removeFile": "Remove",
    "converter.slowNotice":
      "Conversion runs entirely in your browser via WebAssembly — this is slower than native and may take a while for large files. This is normal.",

    // SEO — Converter
    "seo.converter.title":
      "Video Converter — Convert Video & Audio in Your Browser",
    "seo.converter.description":
      "Free online video converter. Convert MP4, WebM, MKV, MP3, AAC, GIF and more entirely in your browser with ffmpeg.wasm. No upload required.",

    // 404
    "404.title": "404 — Page Not Found",
    "404.heading": "Page not found",
    "404.description": "The page you're looking for doesn't exist.",
    "404.goHome": "Go home",

    // SEO
    "seo.home.title": "Güven Değirmenci — Developer, Creator, Problem Solver",
    "seo.home.description":
      "Full-stack developer and Managing Partner at Next Geo with {years}+ years of experience building AI-powered location analytics platforms, GIS systems, and developer tools. Based in Istanbul, Türkiye.",
    "seo.tools.title": "Developer Tools — Güven Değirmenci",
    "seo.tools.description":
      "Free developer utilities for GIS, mapping, and web development. H3 hex explorer, coordinate converters, and more.",
    "seo.h3.title": "H3 Explorer — Visualize H3 Hex Cells on a Map",
    "seo.h3.description":
      "Free online tool to visualize Uber H3 hexagonal grid cells on an interactive dark-themed map. Enter any H3 index to instantly locate and inspect the cell.",
    "seo.defaultDescription":
      "Güven Değirmenci — Full-stack developer and Managing Partner at Next Geo, specializing in AI-powered location analytics, GIS systems, and developer tools.",

    // Language switcher
    "lang.switch": "TR",
    "lang.switchLabel": "Türkçe",
  },
  tr: {
    // Nav
    "nav.home": "Ana Sayfa",
    "nav.tools": "Araçlar",

    // Hero
    "hero.badge": "Yönetici Ortak @ Next Geo",
    "hero.subtitle":
      "{years}+ yıllık deneyimle yapay zeka destekli konum analitiği platformları, CBS sistemleri ve geliştirici araçları üreten full-stack geliştirici. Next Geo'da Yönetici Ortak.",
    "hero.scroll": "Kaydır",

    // About
    "about.label": "Hakkımda",
    "about.heading": "Kısa bir tanıtım.",
    "about.bio1":
      "Ben Güven Değirmenci — 2000 yılında Kırklareli'nde doğdum. 2018'de Düvenciler Anadolu Lisesi'nden mezun olduktan sonra, Kırklareli Üniversitesi Mütercim-Tercümanlık bölümünde okurken eş zamanlı olarak yazılım mühendisliği kariyerimi inşa ettim.",
    "about.bio2":
      "2020'de Next Geo'ya Yazılım Geliştirici olarak katıldım ve 2022'de Yönetici Ortak pozisyonuna yükseldim. Son {years}+ yılda yapay zeka destekli konum analitiği platformları, CBS sistemleri ve geliştirici araçları üretiyorum.",
    "about.techHeading": "Çalıştığım teknolojiler",
    "about.stat.location": "Konum",
    "about.stat.locationValue": "İstanbul, Türkiye",
    "about.stat.role": "Pozisyon",
    "about.stat.roleValue": "Yönetici Ortak",
    "about.stat.experience": "Deneyim",
    "about.stat.experienceValue": "{years}+ yıl",
    "about.tech.frontend": "Ön Uç",
    "about.tech.backend": "Arka Uç",
    "about.tech.data": "Veri",
    "about.tech.infra": "Altyapı",

    // Footer
    "footer.copyright": "© {year} Güven Değirmenci",

    // Tools page
    "tools.label": "Araçlar",
    "tools.heading": "Geliştirici araçları.",
    "tools.description":
      "Kendim için geliştirdiğim küçük araçlar. Kullanmaktan çekinmeyin.",
    "tools.h3.name": "H3 Gezgini",
    "tools.h3.description":
      "H3 altıgen hücrelerini interaktif haritada görselleştirin.",

    // Converter tool listing
    "tools.converter.name": "Video Dönüştürücü",
    "tools.converter.description":
      "Video ve ses dosyalarını tarayıcınızda dönüştürün.",

    // H3 Explorer
    "h3.backToTools": "← Araçlara dön",
    "h3.heading": "H3 Gezgini",
    "h3.description":
      "Haritada görselleştirmek için bir H3 altıgen indeksi girin.",
    "h3.placeholder": "örn. 8928308280fffff",
    "h3.placeholderDecimal": "örn. 622236750694711295",
    "h3.errorEmpty": "Bir H3 indeksi girin",
    "h3.errorInvalid": "Geçersiz H3 indeksi",

    // Converter
    "converter.backToTools": "← Araçlara dön",
    "converter.heading": "Video Dönüştürücü",
    "converter.description":
      "Video ve ses dosyalarını tamamen tarayıcınızda dönüştürün. Yükleme yok, sunucu yok.",
    "converter.dropzone": "Bir dosya sürükleyin veya tıklayıp seçin",
    "converter.dropzoneActive": "Bırakın!",
    "converter.fileSize": "Boyut",
    "converter.fileType": "Tür",
    "converter.fileSizeWarning":
      "50 MB üzeri dosyalar performans sorunlarına yol açabilir veya başarısız olabilir.",
    "converter.outputFormat": "Çıktı formatı",
    "converter.codec": "Kodek",
    "converter.quality": "Kalite",
    "converter.balanced": "Dengeli",
    "converter.small": "Küçük",
    "converter.custom": "Özel",
    "converter.advanced": "Gelişmiş ayarlar",
    "converter.rateControl": "Bit hızı kontrolü",
    "converter.crf": "CRF",
    "converter.videoBitrate": "Video bit hızı",
    "converter.audioBitrate": "Ses bit hızı",
    "converter.scale": "Ölçek",
    "converter.frameRate": "Kare hızı",
    "converter.audioCodec": "Ses kodek",
    "converter.sampleRate": "Örnekleme hızı",
    "converter.channels": "Kanallar",
    "converter.keepOriginal": "Orijinali koru",
    "converter.mono": "Mono",
    "converter.stereo": "Stereo",
    "converter.none": "Yok",
    "converter.copy": "Kopyala (yeniden kodlama yok)",
    "converter.convert": "Dönüştür",
    "converter.converting": "Dönüştürülüyor...",
    "converter.cancel": "İptal",
    "converter.loadingFfmpeg": "FFmpeg yükleniyor...",
    "converter.download": "İndir",
    "converter.outputSize": "Çıktı boyutu",
    "converter.error": "Dönüştürme başarısız",
    "converter.convertAnother": "Başka bir dosya dönüştür",
    "converter.removeFile": "Kaldır",
    "converter.slowNotice":
      "Dönüştürme tamamen tarayıcınızda WebAssembly ile çalışır — bu, yerel işlemden daha yavaştır ve büyük dosyalarda zaman alabilir. Bu normaldir.",

    // SEO — Converter
    "seo.converter.title":
      "Video Dönüştürücü — Tarayıcınızda Video ve Ses Dönüştürün",
    "seo.converter.description":
      "Ücretsiz çevrimiçi video dönüştürücü. MP4, WebM, MKV, MP3, AAC, GIF ve daha fazlasını ffmpeg.wasm ile tamamen tarayıcınızda dönüştürün. Yükleme gerekmez.",

    // 404
    "404.title": "404 — Sayfa Bulunamadı",
    "404.heading": "Sayfa bulunamadı",
    "404.description": "Aradığınız sayfa mevcut değil.",
    "404.goHome": "Ana sayfaya dön",

    // SEO
    "seo.home.title": "Güven Değirmenci — Geliştirici, Yaratıcı, Problem Çözücü",
    "seo.home.description":
      "Next Geo'da Yönetici Ortak ve full-stack geliştirici. {years}+ yıllık deneyimle yapay zeka destekli konum analitiği platformları, CBS sistemleri ve geliştirici araçları üretiyor. İstanbul, Türkiye merkezli.",
    "seo.tools.title": "Geliştirici Araçları — Güven Değirmenci",
    "seo.tools.description":
      "CBS, haritalama ve web geliştirme için ücretsiz geliştirici araçları. H3 altıgen gezgini, koordinat dönüştürücüler ve daha fazlası.",
    "seo.h3.title": "H3 Gezgini — H3 Altıgen Hücrelerini Haritada Görselleştirin",
    "seo.h3.description":
      "Uber H3 altıgen ızgara hücrelerini koyu temalı interaktif haritada görselleştirmek için ücretsiz çevrimiçi araç. Herhangi bir H3 indeksi girerek hücreyi anında bulun ve inceleyin.",
    "seo.defaultDescription":
      "Güven Değirmenci — Yapay zeka destekli konum analitiği, CBS sistemleri ve geliştirici araçları konularında uzmanlaşmış full-stack geliştirici ve Next Geo'da Yönetici Ortak.",

    // Language switcher
    "lang.switch": "EN",
    "lang.switchLabel": "English",
  },
} as const;

type TranslationKey = keyof (typeof translations)["en"];

export function t(
  locale: Locale,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  let text = translations[locale][key] ?? translations.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

export function getLocaleFromUrl(url: URL): Locale {
  const [, segment] = url.pathname.split("/");
  if (segment === "tr") return "tr";
  return "en";
}

export function getLocalizedPath(locale: Locale, path: string): string {
  const clean = path.replace(/^\/(tr\/?)/, "/");
  if (locale === "en") return clean || "/";
  return `/tr${clean === "/" ? "" : clean}`;
}
