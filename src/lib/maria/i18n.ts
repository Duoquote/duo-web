// Standalone i18n for /maria. Deliberately shares nothing with the site dictionary —
// this page has its own languages (tr/en/pl), its own tone, its own everything.

export type MLocale = "tr" | "en" | "pl";

export const M_LOCALES: { id: MLocale; label: string; flag: string }[] = [
  { id: "tr", label: "Türkçe", flag: "🇹🇷" },
  { id: "en", label: "English", flag: "🇬🇧" },
  { id: "pl", label: "Polski", flag: "🇵🇱" },
];

const dict = {
  tr: {
    "brand": "kahveli kahve date",
    "tagline": "bir fincan kahve, bir gün, bir plan.",
    "intro":
      "Selam Maria! Bu küçük şey sadece senin için. Bir gün seç, bir saat seç, bir kahveci seç — istersen yemek de ekle. Gerisini ben ayarlarım.",

    // steps — avoid an uppercase Z here: the display face draws it like a "2"
    "step.when": "GÜN VE SAAT",
    "step.coffee": "KAHVE",
    "step.food": "YEMEK",
    "step.done": "PLAN",
    "step.optional": "opsiyonel",

    // mood meter
    "mood.label": "plan durumu",
    "mood.0": "henüz bir şey yok",
    "mood.1": "iyi başlangıç",
    "mood.2": "gitgide güzelleşiyor",
    "mood.3": "neredeyse mükemmel",
    "mood.4": "kusursuz plan",

    // schedule
    "sched.title": "Bir gün ve saat seç",
    "sched.help":
      "Bir günün üzerinde saatleri sürükle. Yeşil kutular müsait olduğumuz saatler.",
    "sched.legend.free": "müsait",
    "sched.legend.guven": "Güven işte (08–17)",
    "sched.legend.maria": "sen işte (10–19)",
    "sched.legend.locked": "kapalı",
    "sched.hours": "saat",
    "sched.pickedNone": "henüz saat seçilmedi",
    "sched.duration": "{h} saat",
    "sched.clear": "temizle",
    "sched.shorter": "bir saat kısalt",
    "sched.longer": "bir saat uzat",
    "sched.weekend": "hafta sonu — bütün gün müsait",
    "sched.earliest": "2 Ağustos'tan önce İstanbul'da değilim, o yüzden kapalı.",
    "sched.month.prev": "önceki",
    "sched.month.next": "sonraki",

    // venues
    "venue.coffeeTitle": "Kahveyi nerede içelim?",
    "venue.foodTitle": "Bir şeyler yemek ister misin?",
    "venue.foodSkip": "Sadece kahve, teşekkürler",
    "venue.foodSkipped": "yemek yok — sadece kahve",
    "venue.tier.core": "Ataşehir civarı",
    "venue.tier.hop": "Kısa yolculuk (Kadıköy)",
    "venue.rating": "puan",
    "venue.reviews": "yorum",
    "venue.distance": "mesafe",
    "venue.openHours": "açılış",
    "venue.walk": "{min} dk yürüme",
    "venue.drive": "{min} dk araba",
    "venue.closedThen": "seçtiğin saatte kapalı olabilir",
    "venue.openThen": "seçtiğin saatte açık",
    "venue.maps": "Haritada aç",
    "venue.pick": "Burayı seç",
    "venue.picked": "Seçildi",
    "venue.filterAll": "hepsi",

    // categories
    "cat.coffee": "Kahveci",
    "cat.asian": "Asya mutfağı",
    "cat.burger": "Burger & tavuk",
    "cat.quick": "Esnaf lezzetleri",

    // summary
    "sum.title": "Planımız",
    "sum.when": "Ne zaman",
    "sum.coffee": "Kahve",
    "sum.food": "Yemek",
    "sum.none": "—",
    "sum.copy": "Planı kopyala",
    "sum.copied": "Kopyalandı!",
    "sum.send": "WhatsApp'tan gönder",
    "sum.ics": "Takvime ekle",
    "sum.link": "Bağlantıyı kopyala",
    "sum.linkCopied": "Bağlantı kopyalandı!",
    "sum.incomplete": "Önce bir gün, saat ve kahveci seç.",
    "sum.ready": "Hazır! Bana gönder, orada olacağım.",
    "sum.wa": "Merhaba Güven! Kahveli kahve date planım:",

    // misc
    "misc.rain": "yağmur",
    "misc.lang": "dil",
    "misc.reset": "baştan başla",
    "misc.footer": "Güven tarafından, biraz fazla özenle yapıldı.",
  },

  en: {
    "brand": "kahveli kahve date",
    "tagline": "one cup of coffee, one day, one plan.",
    "intro":
      "Hi Maria! This little thing is just for you. Pick a day, pick an hour, pick a coffee place — add food if you feel like it. I'll handle the rest.",

    "step.when": "WHEN",
    "step.coffee": "COFFEE",
    "step.food": "FOOD",
    "step.done": "PLAN",
    "step.optional": "optional",

    "mood.label": "plan status",
    "mood.0": "nothing yet",
    "mood.1": "good start",
    "mood.2": "getting nicer",
    "mood.3": "almost perfect",
    "mood.4": "flawless plan",

    "sched.title": "Pick a day and a time",
    "sched.help": "Drag across the hours on a day. Green blocks are when we're both free.",
    "sched.legend.free": "free",
    "sched.legend.guven": "Güven at work (08–17)",
    "sched.legend.maria": "you at work (10–19)",
    "sched.legend.locked": "closed",
    "sched.hours": "hours",
    "sched.pickedNone": "no time picked yet",
    "sched.duration": "{h}h",
    "sched.clear": "clear",
    "sched.shorter": "one hour shorter",
    "sched.longer": "one hour longer",
    "sched.weekend": "weekend — free all day",
    "sched.earliest": "I'm not in Istanbul before August 2nd, so it's locked.",
    "sched.month.prev": "previous",
    "sched.month.next": "next",

    "venue.coffeeTitle": "Where should we have coffee?",
    "venue.foodTitle": "Want to eat something too?",
    "venue.foodSkip": "Just coffee, thanks",
    "venue.foodSkipped": "no food — coffee only",
    "venue.tier.core": "Around Ataşehir",
    "venue.tier.hop": "Short trip (Kadıköy)",
    "venue.rating": "rating",
    "venue.reviews": "reviews",
    "venue.distance": "distance",
    "venue.openHours": "open",
    "venue.walk": "{min} min walk",
    "venue.drive": "{min} min drive",
    "venue.closedThen": "may be closed at your chosen time",
    "venue.openThen": "open at your chosen time",
    "venue.maps": "Open in Maps",
    "venue.pick": "Pick this one",
    "venue.picked": "Picked",
    "venue.filterAll": "all",

    "cat.coffee": "Coffee shop",
    "cat.asian": "Asian food",
    "cat.burger": "Burger & chicken",
    "cat.quick": "Local street food",

    "sum.title": "Our plan",
    "sum.when": "When",
    "sum.coffee": "Coffee",
    "sum.food": "Food",
    "sum.none": "—",
    "sum.copy": "Copy the plan",
    "sum.copied": "Copied!",
    "sum.send": "Send on WhatsApp",
    "sum.ics": "Add to calendar",
    "sum.link": "Copy link",
    "sum.linkCopied": "Link copied!",
    "sum.incomplete": "Pick a day, a time and a coffee place first.",
    "sum.ready": "Ready! Send it to me and I'll be there.",
    "sum.wa": "Hi Güven! Here's my kahveli kahve date plan:",

    "misc.rain": "rain",
    "misc.lang": "language",
    "misc.reset": "start over",
    "misc.footer": "Made by Güven, with slightly too much care.",
  },

  pl: {
    "brand": "kahveli kahve date",
    "tagline": "jedna kawa, jeden dzień, jeden plan.",
    "intro":
      "Cześć Maria! Ta mała rzecz jest tylko dla Ciebie. Wybierz dzień, wybierz godzinę, wybierz kawiarnię — a jeśli chcesz, dodaj też jedzenie. O resztę ja się zatroszczę.",

    "step.when": "KIEDY",
    "step.coffee": "KAWA",
    "step.food": "JEDZENIE",
    "step.done": "PLAN",
    "step.optional": "opcjonalnie",

    "mood.label": "stan planu",
    "mood.0": "jeszcze nic",
    "mood.1": "dobry początek",
    "mood.2": "coraz lepiej",
    "mood.3": "prawie idealnie",
    "mood.4": "plan bez zarzutu",

    "sched.title": "Wybierz dzień i godzinę",
    "sched.help":
      "Przeciągnij po godzinach w wybranym dniu. Zielone bloki to godziny, kiedy oboje jesteśmy wolni.",
    "sched.legend.free": "wolne",
    "sched.legend.guven": "Güven w pracy (08–17)",
    "sched.legend.maria": "Ty w pracy (10–19)",
    "sched.legend.locked": "zamknięte",
    "sched.hours": "godz.",
    "sched.pickedNone": "nie wybrano jeszcze godziny",
    "sched.duration": "{h} godz.",
    "sched.clear": "wyczyść",
    "sched.shorter": "godzinę krócej",
    "sched.longer": "godzinę dłużej",
    "sched.weekend": "weekend — wolne cały dzień",
    "sched.earliest": "Przed 2 sierpnia nie ma mnie w Stambule, więc jest zablokowane.",
    "sched.month.prev": "poprzedni",
    "sched.month.next": "następny",

    "venue.coffeeTitle": "Gdzie pijemy kawę?",
    "venue.foodTitle": "Chcesz też coś zjeść?",
    "venue.foodSkip": "Tylko kawa, dziękuję",
    "venue.foodSkipped": "bez jedzenia — tylko kawa",
    "venue.tier.core": "W okolicy Ataşehir",
    "venue.tier.hop": "Krótki wypad (Kadıköy)",
    "venue.rating": "ocena",
    "venue.reviews": "opinii",
    "venue.distance": "odległość",
    "venue.openHours": "otwarte",
    "venue.walk": "{min} min pieszo",
    "venue.drive": "{min} min autem",
    "venue.closedThen": "może być zamknięte w wybranej godzinie",
    "venue.openThen": "otwarte w wybranej godzinie",
    "venue.maps": "Otwórz w Mapach",
    "venue.pick": "Wybieram to",
    "venue.picked": "Wybrane",
    "venue.filterAll": "wszystko",

    "cat.coffee": "Kawiarnia",
    "cat.asian": "Kuchnia azjatycka",
    "cat.burger": "Burger i kurczak",
    "cat.quick": "Lokalne street food",

    "sum.title": "Nasz plan",
    "sum.when": "Kiedy",
    "sum.coffee": "Kawa",
    "sum.food": "Jedzenie",
    "sum.none": "—",
    "sum.copy": "Kopiuj plan",
    "sum.copied": "Skopiowano!",
    "sum.send": "Wyślij przez WhatsApp",
    "sum.ics": "Dodaj do kalendarza",
    "sum.link": "Kopiuj link",
    "sum.linkCopied": "Link skopiowany!",
    "sum.incomplete": "Najpierw wybierz dzień, godzinę i kawiarnię.",
    "sum.ready": "Gotowe! Wyślij mi to, a ja tam będę.",
    "sum.wa": "Cześć Güven! Oto mój plan kahveli kahve date:",

    "misc.rain": "deszcz",
    "misc.lang": "język",
    "misc.reset": "zacznij od nowa",
    "misc.footer": "Zrobione przez Güvena, z trochę zbyt dużą starannością.",
  },
} as const;

export type MKey = keyof (typeof dict)["tr"];

export function mt(
  locale: MLocale,
  key: MKey,
  vars?: Record<string, string | number>,
): string {
  let text: string = dict[locale][key] ?? dict.tr[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

/** Weekday + month names per locale, for the schedule grid headers. */
export const CAL_NAMES: Record<
  MLocale,
  { days: string[]; daysShort: string[]; months: string[] }
> = {
  tr: {
    days: ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"],
    daysShort: ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"],
    months: ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"],
  },
  en: {
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  },
  pl: {
    days: ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"],
    daysShort: ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"],
    months: ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"],
  },
};
