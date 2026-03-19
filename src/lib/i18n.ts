export type Locale = "en" | "tr";

const translations = {
  en: {
    // Nav
    "nav.home": "Home",
    "nav.tools": "Tools",
    "nav.links": "Links",

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

    // Geo Viewer tool listing
    "tools.geoViewer.name": "Geo Viewer",
    "tools.geoViewer.description":
      "View GeoJSON, Shapefile & KML files on a map.",

    // ImVector tool listing
    "tools.imvector.name": "Image Vectorizer",
    "tools.imvector.description":
      "Convert raster images to SVG vectors in your browser.",

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
    "converter.addMore": "Add more files",
    "converter.clearAll": "Clear all",
    "converter.downloadAll": "Download All",
    "converter.completed": "completed",
    "converter.failed": "failed",
    "converter.wasmPromptTitle": "FFmpeg needs to be downloaded",
    "converter.wasmPromptDesc":
      "This will download the FFmpeg WebAssembly binary (~32 MB) from a CDN. It will be cached by your browser for future use.",
    "converter.wasmAccept": "Continue",
    "converter.wasmDontShowAgain": "Don't show this again",
    "converter.slowNotice":
      "Conversion runs entirely in your browser via WebAssembly — this is slower than native and may take a while for large files. This is normal.",

    // Geo Viewer
    "geoViewer.backToTools": "\u2190 Back to tools",
    "geoViewer.heading": "Geo Viewer",
    "geoViewer.description":
      "Drop a GeoJSON, Shapefile (ZIP), or KML file to visualize on an interactive map. All processing in your browser.",
    "geoViewer.dropzone": "Drop a file here or click to browse",
    "geoViewer.dropzoneActive": "Drop it!",
    "geoViewer.dropzoneHint": "Supports .geojson, .json, .kml, .zip (shapefile)",
    "geoViewer.loading": "Parsing file...",
    "geoViewer.features": "features",
    "geoViewer.vertices": "vertices",
    "geoViewer.properties": "Properties",
    "geoViewer.noSelection": "Click a feature on the map to inspect",
    "geoViewer.fitBounds": "Fit to data",
    "geoViewer.loadAnother": "Load another",
    "geoViewer.copyJson": "Copy JSON",
    "geoViewer.copied": "Copied!",
    "geoViewer.errorFormat": "Unsupported file format",
    "geoViewer.errorParse": "Failed to parse file",
    "geoViewer.errorNoFeatures": "No features found",
    "geoViewer.errorShpZip": "Shapefiles must be provided as a .zip",

    // ImVector
    "imvector.backToTools": "\u2190 Back to tools",
    "imvector.heading": "Image Vectorizer",
    "imvector.description":
      "Convert raster images to clean SVG vectors entirely in your browser. AI upscaling, color quantization, and shape detection.",
    "imvector.dropzone": "Drop an image here or click to browse",
    "imvector.errorFormat": "Unsupported image format",
    "imvector.settings": "Settings",
    "imvector.colors": "Colors",
    "imvector.denoise": "Denoise",
    "imvector.detectShapes": "Detect shapes",
    "imvector.aiUpscale": "AI upscale (4x)",
    "imvector.aiDenoise": "AI denoise",
    "imvector.optimize": "SVG optimize",
    "imvector.optNone": "None",
    "imvector.optBasic": "Basic",
    "imvector.optFull": "Full",
    "imvector.showSrc": "Original",
    "imvector.showingSrc": "Original",
    "imvector.download": "Download SVG",
    "imvector.tryAnother": "New image",
    "imvector.clearAll": "Clear all",
    "imvector.reprocess": "Reprocess with current settings",
    "imvector.queued": "Waiting in queue...",
    "imvector.type": "Type",
    "imvector.totalTime": "Total",
    "imvector.modelPromptTitle": "AI model needs to be downloaded",
    "imvector.modelPromptDesc":
      "AI upscaling requires a Real-ESRGAN model (~18 MB). It will be downloaded once and cached in your browser for future use.",
    "imvector.modelDontShow": "Don't show this again",
    "imvector.modelAccept": "Download & Continue",
    "imvector.modelSkip": "Skip AI",

    // SEO — Converter
    "seo.converter.title":
      "Video Converter — Convert Video & Audio in Your Browser",
    "seo.converter.description":
      "Free online video converter. Convert MP4, WebM, MKV, MP3, AAC, GIF and more entirely in your browser with ffmpeg.wasm. No upload required.",

    // SEO — Geo Viewer
    "seo.geoViewer.title":
      "Geo Viewer \u2014 View GeoJSON, Shapefile & KML on a Map",
    "seo.geoViewer.description":
      "Free online tool to visualize GeoJSON, Shapefile, and KML files on an interactive WebGL map. No upload, no server.",

    // SEO — ImVector
    "seo.imvector.title":
      "Image Vectorizer \u2014 Convert Images to SVG in Your Browser",
    "seo.imvector.description":
      "Free online image vectorizer. Convert PNG, JPEG, WebP to clean SVG with AI upscaling, color quantization, and shape detection. No upload, no server.",

    // Links page
    "links.label": "Links",
    "links.heading": "Curated links.",
    "links.description":
      "Useful tools and resources I've bookmarked over the years.",
    "links.category.gis": "GIS & Mapping",
    "links.category.design": "Design & Productivity",

    // SEO — Links
    "seo.links.title": "Links — Güven Değirmenci",
    "seo.links.description":
      "Curated collection of developer bookmarks for GIS, mapping, design and productivity tools.",

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
    "nav.links": "Bağlantılar",

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

    // Geo Viewer tool listing
    "tools.geoViewer.name": "Geo Görüntüleyici",
    "tools.geoViewer.description":
      "GeoJSON, Shapefile ve KML dosyalarını haritada görüntüleyin.",

    // ImVector tool listing
    "tools.imvector.name": "Görsel Vektörleştirici",
    "tools.imvector.description":
      "Raster görselleri tarayıcınızda SVG vektörlere dönüştürün.",

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
    "converter.addMore": "Daha fazla dosya ekle",
    "converter.clearAll": "Tümünü temizle",
    "converter.downloadAll": "Tümünü İndir",
    "converter.completed": "tamamlandı",
    "converter.failed": "başarısız",
    "converter.wasmPromptTitle": "FFmpeg indirilmesi gerekiyor",
    "converter.wasmPromptDesc":
      "Bu işlem CDN üzerinden FFmpeg WebAssembly dosyasını (~32 MB) indirecektir. Tarayıcınız tarafından önbelleğe alınacaktır.",
    "converter.wasmAccept": "Devam Et",
    "converter.wasmDontShowAgain": "Bir daha gösterme",
    "converter.slowNotice":
      "Dönüştürme tamamen tarayıcınızda WebAssembly ile çalışır — bu, yerel işlemden daha yavaştır ve büyük dosyalarda zaman alabilir. Bu normaldir.",

    // Geo Viewer
    "geoViewer.backToTools": "\u2190 Araçlara dön",
    "geoViewer.heading": "Geo Görüntüleyici",
    "geoViewer.description":
      "GeoJSON, Shapefile (ZIP) veya KML dosyasını interaktif haritada görselleştirmek için sürükleyin. Tüm işlemler tarayıcınızda.",
    "geoViewer.dropzone": "Bir dosya sürükleyin veya tıklayıp seçin",
    "geoViewer.dropzoneActive": "Bırakın!",
    "geoViewer.dropzoneHint":
      ".geojson, .json, .kml, .zip (shapefile) desteklenir",
    "geoViewer.loading": "Dosya ayrıştırılıyor...",
    "geoViewer.features": "özellik",
    "geoViewer.vertices": "köşe",
    "geoViewer.properties": "Özellikler",
    "geoViewer.noSelection": "İncelemek için haritada bir özelliğe tıklayın",
    "geoViewer.fitBounds": "Veriye sığdır",
    "geoViewer.loadAnother": "Başka yükle",
    "geoViewer.copyJson": "JSON Kopyala",
    "geoViewer.copied": "Kopyalandı!",
    "geoViewer.errorFormat": "Desteklenmeyen dosya formatı",
    "geoViewer.errorParse": "Dosya ayrıştırılamadı",
    "geoViewer.errorNoFeatures": "Özellik bulunamadı",
    "geoViewer.errorShpZip": "Shapefile dosyaları .zip olarak sağlanmalıdır",

    // ImVector
    "imvector.backToTools": "\u2190 Araçlara dön",
    "imvector.heading": "Görsel Vektörleştirici",
    "imvector.description":
      "Raster görselleri tarayıcınızda temiz SVG vektörlere dönüştürün. Yapay zeka ölçeklendirme, renk nicemleme ve şekil algılama.",
    "imvector.dropzone": "Bir görsel sürükleyin veya tıklayıp seçin",
    "imvector.errorFormat": "Desteklenmeyen görsel formatı",
    "imvector.settings": "Ayarlar",
    "imvector.colors": "Renkler",
    "imvector.denoise": "Gürültü azaltma",
    "imvector.detectShapes": "Şekil algılama",
    "imvector.aiUpscale": "AI ölçeklendirme (4x)",
    "imvector.aiDenoise": "AI gürültü azaltma",
    "imvector.optimize": "SVG optimizasyon",
    "imvector.optNone": "Yok",
    "imvector.optBasic": "Temel",
    "imvector.optFull": "Tam",
    "imvector.showSrc": "Orijinal",
    "imvector.showingSrc": "Orijinal",
    "imvector.download": "SVG İndir",
    "imvector.tryAnother": "Yeni görsel",
    "imvector.clearAll": "Tümünü temizle",
    "imvector.reprocess": "Mevcut ayarlarla yeniden işle",
    "imvector.queued": "Sırada bekliyor...",
    "imvector.type": "Tür",
    "imvector.totalTime": "Toplam",
    "imvector.modelPromptTitle": "AI modeli indirilmesi gerekiyor",
    "imvector.modelPromptDesc":
      "AI ölçeklendirme için Real-ESRGAN modeli (~18 MB) gerekiyor. Bir kez indirilecek ve tarayıcınızda önbelleğe alınacaktır.",
    "imvector.modelDontShow": "Bir daha gösterme",
    "imvector.modelAccept": "İndir ve Devam Et",
    "imvector.modelSkip": "AI'yı Atla",

    // SEO — Converter
    "seo.converter.title":
      "Video Dönüştürücü — Tarayıcınızda Video ve Ses Dönüştürün",
    "seo.converter.description":
      "Ücretsiz çevrimiçi video dönüştürücü. MP4, WebM, MKV, MP3, AAC, GIF ve daha fazlasını ffmpeg.wasm ile tamamen tarayıcınızda dönüştürün. Yükleme gerekmez.",

    // SEO — Geo Viewer
    "seo.geoViewer.title":
      "Geo Görüntüleyici \u2014 GeoJSON, Shapefile ve KML Haritada Görüntüle",
    "seo.geoViewer.description":
      "GeoJSON, Shapefile ve KML dosyalarını interaktif WebGL haritada görselleştirmek için ücretsiz çevrimiçi araç. Yükleme yok, sunucu yok.",

    // SEO — ImVector
    "seo.imvector.title":
      "Görsel Vektörleştirici \u2014 Tarayıcınızda Görselleri SVG'ye Dönüştürün",
    "seo.imvector.description":
      "Ücretsiz çevrimiçi görsel vektörleştirici. PNG, JPEG, WebP dosyalarını yapay zeka ölçeklendirme, renk nicemleme ve şekil algılama ile temiz SVG'ye dönüştürün. Yükleme yok, sunucu yok.",

    // Links page
    "links.label": "Bağlantılar",
    "links.heading": "Seçilmiş bağlantılar.",
    "links.description":
      "Yıllar içinde kaydettiğim faydalı araç ve kaynaklar.",
    "links.category.gis": "CBS & Haritalama",
    "links.category.design": "Tasarım & Verimlilik",

    // SEO — Links
    "seo.links.title": "Bağlantılar — Güven Değirmenci",
    "seo.links.description":
      "CBS, haritalama, tasarım ve verimlilik araçları için geliştiricilere özel bağlantı koleksiyonu.",

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
