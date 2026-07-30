// Venue data for /maria.
//
// Ratings, review counts, addresses, coordinates and opening hours were all pulled
// from Google Maps (late July 2026) rather than written from memory. Hours are
// [open, close] in decimal local hours, indexed 0 = Sunday; `close` may exceed 24
// for places that run past midnight, and `null` means closed that day.

export type VenueKind = "coffee" | "asian" | "burger" | "quick";
export type VenueTier = "core" | "hop";

export interface Venue {
  id: string;
  kind: VenueKind;
  tier: VenueTier;
  name: string;
  /** Short, human note per language. Written for Maria, not scraped. */
  note: { tr: string; en: string; pl: string };
  area: string;
  address: string;
  lat: number;
  lon: number;
  rating: number;
  reviews: number;
  /** 7 entries, index 0 = Sunday. */
  hours: ([number, number] | null)[];
  /** true when the weekly hours are an assumption rather than fully scraped */
  hoursApprox?: boolean;
}

const week = (o: number, c: number): ([number, number] | null)[] =>
  Array.from({ length: 7 }, () => [o, c] as [number, number]);

export const VENUES: Venue[] = [
  // ------------------------------------------------------------------ coffee
  {
    id: "luwi",
    kind: "coffee",
    tier: "core",
    name: "Luwi House Coffee",
    note: {
      tr: "Sıcak, sakin, sabah 7'den gece yarısına kadar açık. Konuşmak için ideal.",
      en: "Warm, quiet, open from 7am to almost midnight. Easy place to talk.",
      pl: "Ciepłe, ciche, otwarte od 7 rano prawie do północy. Dobre na rozmowę.",
    },
    area: "Küçükbakkalköy",
    address: "Küçükbakkalköy, Yüksel Sk. No:10/A, Ataşehir",
    lat: 40.980778,
    lon: 29.107759,
    rating: 4.7,
    reviews: 81,
    hours: week(7, 23.5),
  },
  {
    id: "ein",
    kind: "coffee",
    tier: "core",
    name: "Ein Coffee House",
    note: {
      tr: "Ataşehir'in en sevilen küçük kahvecisi. Pazar günleri kapalı.",
      en: "Ataşehir's best-loved little coffee house. Closed on Sundays.",
      pl: "Najbardziej lubiana mała kawiarnia w Ataşehir. W niedziele zamknięte.",
    },
    area: "Küçükbakkalköy",
    address: "Küçükbakkalköy, Cengizhan Sk. No:4/B, Ataşehir",
    lat: 40.979605,
    lon: 29.109464,
    rating: 4.7,
    reviews: 146,
    hours: [null, [8.5, 22.5], [9, 22.5], [8.5, 22.5], [8.5, 22.5], [8.5, 22.5], [10.5, 18]],
  },
  {
    id: "depo",
    kind: "coffee",
    tier: "core",
    name: "Depo Coffee Roasting",
    note: {
      tr: "Kendi kavurmasını yapıyor, geniş ve ferah. Gece 1'e kadar açık.",
      en: "Roasts its own beans, roomy and bright. Open until 1:30am.",
      pl: "Własna palarnia, przestronnie i jasno. Otwarte do 1:30.",
    },
    area: "Kayışdağı",
    address: "Kayışdağı, İnkilap Cad. 10A, Ataşehir",
    lat: 40.976249,
    lon: 29.152774,
    rating: 4.5,
    reviews: 373,
    hours: [[10, 25.5], [8.5, 25.5], [8.5, 25.5], [8.5, 25.5], [8.5, 25.5], [8.5, 25.5], [10, 25.5]],
  },
  {
    id: "duppo",
    kind: "coffee",
    tier: "core",
    name: "Duppo Coffee",
    note: {
      tr: "Kalabalık ve canlı, her gün gece 1'e kadar açık.",
      en: "Busy and lively, open till 1am every single day.",
      pl: "Ruchliwie i żywo, codziennie otwarte do 1 w nocy.",
    },
    area: "Kayışdağı",
    address: "Kayışdağı, Yavuz Bey Sk. No: 4-6 A, Ataşehir",
    lat: 40.976715,
    lon: 29.151447,
    rating: 4.3,
    reviews: 684,
    hours: week(9, 25),
  },
  {
    id: "kafeinzone",
    kind: "coffee",
    tier: "core",
    name: "Kafeinzone Coffee",
    note: {
      tr: "Uygun fiyatlı üçüncü nesil kahveci, sabah erken açılıyor.",
      en: "Affordable third-wave spot, opens early and closes very late.",
      pl: "Niedroga kawiarnia trzeciej fali, otwiera wcześnie, zamyka późno.",
    },
    area: "İnönü",
    address: "İnönü, Kayışdağı Cd. Yanyolu 314/B, Ataşehir",
    lat: 40.976117,
    lon: 29.150934,
    rating: 4.0,
    reviews: 422,
    hours: [[9, 25], [8.5, 25], [8.5, 25], [8.5, 25], [8.5, 25], [8.5, 25], [8.5, 25]],
  },
  {
    id: "kronotrop",
    kind: "coffee",
    tier: "core",
    name: "Kronotrop Metropol",
    note: {
      tr: "İstanbul'un en bilinen kahve markası, Metropol AVM içinde. Quick China ile aynı yerde.",
      en: "Istanbul's best-known coffee roaster, inside Metropol mall — same building as Quick China.",
      pl: "Najbardziej znana marka kawy w Stambule, w centrum Metropol — ten sam budynek co Quick China.",
    },
    area: "Metropol AVM",
    address: "Atatürk, Ertuğrul Gazi Sk. No.2, Ataşehir",
    lat: 40.994109,
    lon: 29.124153,
    rating: 3.7,
    reviews: 0,
    hours: week(9, 23),
    hoursApprox: true,
  },

  // ------------------------------------------------------------------- asian
  {
    id: "quickchina",
    kind: "asian",
    tier: "core",
    name: "Quick China",
    note: {
      tr: "12 binden fazla yorumla 4.8 puan — Ataşehir'in en güvenli tercihi.",
      en: "4.8 stars from over 12,000 reviews — the safest bet in Ataşehir.",
      pl: "4,8 gwiazdki z ponad 12 000 opinii — najpewniejszy wybór w Ataşehir.",
    },
    area: "Metropol AVM",
    address: "Atatürk Mah. Ertuğrul Gazi Sk. Metropol AVM, Ataşehir",
    lat: 40.994177,
    lon: 29.122834,
    rating: 4.8,
    reviews: 12248,
    hours: [[11.5, 21.75], [11.5, 21.75], [11.5, 21.75], [11.5, 21.75], [11.5, 21.75], [11.5, 21.75], [11.5, 22.25]],
  },
  {
    id: "kawaii",
    kind: "asian",
    tier: "core",
    name: "Kawaii Sushi",
    note: {
      tr: "Suşi, ramen, noodle. Anadolu yakasının en sevilen uzak doğu adreslerinden.",
      en: "Sushi, ramen, noodles. One of the Asian side's favourite far-east spots.",
      pl: "Sushi, ramen, makarony. Jedno z ulubionych miejsc azjatyckich po tej stronie.",
    },
    area: "Turkuaz Plaza",
    address: "Atatürk Mah. Meriç Cd. Turkuaz Plaza 5/7, Ataşehir",
    lat: 40.99085,
    lon: 29.122215,
    rating: 4.4,
    reviews: 1352,
    hours: week(11.5, 22.75),
  },

  // --------------------------------------------------------- burger & chicken
  {
    id: "betro",
    kind: "burger",
    tier: "hop",
    name: "Betro Burger",
    note: {
      tr: "İstanbul'un en iyi burgerlerinden biri. Sadece Kadıköy'de — biraz yol, çok değer.",
      en: "One of Istanbul's best burgers. Kadıköy only — a bit of a trip, well worth it.",
      pl: "Jeden z najlepszych burgerów w Stambule. Tylko Kadıköy — trochę drogi, ale warto.",
    },
    area: "Kadıköy",
    address: "Caferağa, Arayıcıbaşı Sk. No:16/A, Kadıköy",
    lat: 40.988399,
    lon: 29.027454,
    rating: 4.6,
    reviews: 5644,
    hours: week(11.75, 24.25),
  },
  {
    id: "doyuyo",
    kind: "burger",
    tier: "hop",
    name: "Doyuyo!",
    note: {
      tr: "Çıtır tavuk ve tavuk burger. Puanı düşük, dürüst olmak gerekirse iddialı değil.",
      en: "Crispy chicken and chicken burgers. Rating is low — being honest, it's not a highlight.",
      pl: "Chrupiący kurczak i burgery. Ocena niska — szczerze mówiąc, nie jest to hit.",
    },
    area: "Acıbadem",
    address: "Acıbadem, Çeçen Sok. No:25, Üsküdar",
    lat: 41.001477,
    lon: 29.05459,
    rating: 3.0,
    reviews: 853,
    hours: week(10, 22),
  },

  // ------------------------------------------------------- esnaf / local food
  {
    id: "tatarsalim",
    kind: "quick",
    tier: "core",
    name: "Tatar Salim",
    note: {
      tr: "Ataşehir'in meşhur dönercisi, 9 binden fazla yorum. Kendi yoğurdundan ayran.",
      en: "Ataşehir's famous döner house, 9,000+ reviews. Ayran from their own yoghurt.",
      pl: "Słynny döner w Ataşehir, ponad 9000 opinii. Ayran z własnego jogurtu.",
    },
    area: "Küçükbakkalköy",
    address: "Küçükbakkalköy, Atilla İlhan Cd. & Efe Sk. No:4, Ataşehir",
    lat: 40.986181,
    lon: 29.109776,
    rating: 4.3,
    reviews: 9220,
    hours: week(11.5, 21.75),
  },
  {
    id: "mezebalik",
    kind: "quick",
    tier: "core",
    name: "Ataşehir Meze & Balık",
    note: {
      tr: "Balık ve meze, Brandium AVM'de. Gece yarısına kadar açık.",
      en: "Fish and meze at Brandium mall. Open until midnight.",
      pl: "Ryby i przekąski w Brandium. Otwarte do północy.",
    },
    area: "Brandium AVM",
    address: "Küçükbakkalköy, Dereboyu Cd. Brandium AVM 3/C, Ataşehir",
    lat: 40.98341,
    lon: 29.133203,
    rating: 4.7,
    reviews: 59,
    hours: week(10, 24),
  },
  {
    id: "gardas",
    kind: "quick",
    tier: "core",
    name: "Gardaş Cağ Kebap",
    note: {
      tr: "Erzurum usulü cağ kebap, yatay şişte. Gece yarısına kadar açık.",
      en: "Erzurum-style cağ kebab, cooked on a horizontal spit. Open till midnight.",
      pl: "Kebab cağ w stylu Erzurum, z poziomego rożna. Otwarte do północy.",
    },
    area: "İçerenköy",
    address: "İçerenköy, Değirmen Yolu Cd. No:25, Ataşehir",
    lat: 40.962015,
    lon: 29.108918,
    rating: 4.3,
    reviews: 1076,
    hours: week(10, 24),
  },
  {
    id: "cevdet",
    kind: "quick",
    tier: "core",
    name: "Köfteci Cevdet",
    note: {
      tr: "Klasik köfteci. Dikkat: 19:30'da kapanıyor ve pazar günleri kapalı.",
      en: "Classic köfte place. Heads up: shuts at 19:30 and closed on Sundays.",
      pl: "Klasyczne kotlety köfte. Uwaga: zamyka o 19:30, w niedziele nieczynne.",
    },
    area: "İçerenköy",
    address: "İçerenköy, Küçükbakkalköy Yolu Cd. No:11, Ataşehir",
    lat: 40.972644,
    lon: 29.109034,
    rating: 4.4,
    reviews: 1782,
    hours: [null, [11.5, 19.5], [11.5, 19.5], [11.5, 19.5], [11.5, 19.5], [11.5, 19.5], [11.5, 19.5]],
  },
  {
    id: "kilisli",
    kind: "quick",
    tier: "core",
    name: "Kilisli Ömer Usta",
    note: {
      tr: "Lahmacun ve kebap, Ataşehir Bulvarı üzerinde.",
      en: "Lahmacun and kebab, right on Ataşehir Boulevard.",
      pl: "Lahmacun i kebab, przy Ataşehir Bulvarı.",
    },
    area: "Atatürk Mah.",
    address: "Atatürk, Ataşehir Blv. No:3, Ataşehir",
    lat: 40.992477,
    lon: 29.122415,
    rating: 3.8,
    reviews: 653,
    hours: week(11.5, 22),
  },
  {
    id: "pilavdunyasi",
    kind: "quick",
    tier: "core",
    name: "Pilav Dünyası",
    note: {
      tr: "Tavuklu, kavurmalı, ciğerli pilav. Sabah 8'den gece 1'e kadar açık, puanı vasat.",
      en: "Pilav with chicken, beef or liver. Open 8am–1am, though the rating is middling.",
      pl: "Pilaw z kurczakiem, wołowiną lub wątróbką. Otwarte 8–1, ocena średnia.",
    },
    area: "Kayışdağı",
    address: "Kayışdağı, Kayışdağı Cd. No:253, Ataşehir",
    lat: 40.975378,
    lon: 29.153296,
    rating: 3.0,
    reviews: 81,
    hours: week(8, 25),
  },
];

export const COFFEE_VENUES = VENUES.filter((v) => v.kind === "coffee");
export const FOOD_VENUES = VENUES.filter((v) => v.kind !== "coffee");

export const byId = (id: string | null) =>
  id ? VENUES.find((v) => v.id === id) ?? null : null;

/** Rough centre of Ataşehir, used as the reference point for coffee distances. */
export const ATASEHIR_CENTER = { lat: 40.9855, lon: 29.1155 };

export function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Walking at ~4.8 km/h; anything over 25 minutes is quoted as a drive instead. */
export function travelFrom(
  from: { lat: number; lon: number },
  v: Venue,
): { mode: "walk" | "drive"; min: number; km: number } {
  const km = haversineKm(from, v) * 1.25; // straight line → street distance
  const walk = Math.round((km / 4.8) * 60);
  if (walk <= 25) return { mode: "walk", min: Math.max(1, walk), km };
  return { mode: "drive", min: Math.max(4, Math.round((km / 22) * 60)), km };
}

/**
 * Is the venue open for the whole picked window?
 * `start`/`end` are inclusive hour slots, so the visit runs start → end+1.
 */
export function isOpenDuring(v: Venue, dow: number, start: number, end: number): boolean {
  const h = v.hours[dow];
  if (!h) return false;
  return h[0] <= start && h[1] >= end + 1;
}

export function hoursLabel(v: Venue, dow: number): string {
  const h = v.hours[dow];
  if (!h) return "—";
  const fmt = (x: number) => {
    const hh = Math.floor(x) % 24;
    const mm = Math.round((x % 1) * 60);
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };
  return `${fmt(h[0])}–${fmt(h[1])}`;
}
