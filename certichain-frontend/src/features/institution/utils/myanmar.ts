// Myanmar administrative divisions, NRC parts, and format helpers.
// Same convention as lookups.ts: `value` is the backend contract (English name,
// matching what's already stored in institution.state_region etc.), `label` is
// display-only.
//
// ponytail: districts/townships are a plain TS module so they ship in the client
// bundle with the register page. Move to a fetched JSON route if bundle size bites.

import type { Lookup } from "./lookups"

export const STATE_REGIONS: Lookup[] = [
  { value: "Ayeyarwady", label: "Ayeyarwady Region (ဧရာဝတီတိုင်းဒေသကြီး)" },
  { value: "Bago", label: "Bago Region (ပဲခူးတိုင်းဒေသကြီး)" },
  { value: "Chin", label: "Chin State (ချင်းပြည်နယ်)" },
  { value: "Kachin", label: "Kachin State (ကချင်ပြည်နယ်)" },
  { value: "Kayah", label: "Kayah State (ကယားပြည်နယ်)" },
  { value: "Kayin", label: "Kayin State (ကရင်ပြည်နယ်)" },
  { value: "Magway", label: "Magway Region (မကွေးတိုင်းဒေသကြီး)" },
  { value: "Mandalay", label: "Mandalay Region (မန္တလေးတိုင်းဒေသကြီး)" },
  { value: "Mon", label: "Mon State (မွန်ပြည်နယ်)" },
  { value: "Nay Pyi Taw", label: "Nay Pyi Taw Union Territory (နေပြည်တော်)" },
  { value: "Rakhine", label: "Rakhine State (ရခိုင်ပြည်နယ်)" },
  { value: "Sagaing", label: "Sagaing Region (စစ်ကိုင်းတိုင်းဒေသကြီး)" },
  { value: "Shan", label: "Shan State (ရှမ်းပြည်နယ်)" },
  { value: "Tanintharyi", label: "Tanintharyi Region (တနင်္သာရီတိုင်းဒေသကြီး)" },
  { value: "Yangon", label: "Yangon Region (ရန်ကုန်တိုင်းဒေသကြီး)" },
]

const lk = (names: string[]): Lookup[] => names.map((n) => ({ value: n, label: n }))

export const DISTRICTS: Record<string, Lookup[]> = {
  Ayeyarwady: lk(["Hinthada", "Labutta", "Maubin", "Myaungmya", "Pathein", "Pyapon"]),
  Bago: lk(["Bago", "Taungoo", "Pyay", "Thayarwady"]),
  Chin: lk(["Falam", "Hakha", "Mindat", "Matupi", "Tedim", "Tonzang"]),
  Kachin: lk(["Bhamo", "Mohnyin", "Myitkyina", "Puta-O"]),
  Kayah: lk(["Bawlakhe", "Loikaw"]),
  Kayin: lk(["Hpa-An", "Hpapun", "Kawkareik", "Myawaddy"]),
  Magway: lk(["Gangaw", "Magway", "Minbu", "Pakokku", "Thayet"]),
  Mandalay: lk(["Kyaukse", "Mandalay", "Meiktila", "Myingyan", "Nyaung-U", "Pyinoolwin", "Yamethin"]),
  Mon: lk(["Mawlamyine", "Thaton"]),
  "Nay Pyi Taw": lk(["Det Khi Na", "Oke Ta Ra"]),
  Rakhine: lk(["Kyaukpyu", "Maungdaw", "Sittwe", "Thandwe"]),
  Sagaing: lk(["Hkamti", "Kale", "Katha", "Mawlaik", "Monywa", "Sagaing", "Shwebo", "Tamu", "Yinmabin"]),
  Shan: lk(["Kengtung", "Kyaukme", "Lashio", "Langkho", "Loilen", "Muse", "Taunggyi", "Tachileik"]),
  Tanintharyi: lk(["Dawei", "Kawthaung", "Myeik"]),
  Yangon: lk(["Yangon East", "Yangon North", "Yangon South", "Yangon West"]),
}

export const TOWNSHIPS: Record<string, Lookup[]> = {
  // Ayeyarwady
  Hinthada: lk(["Hinthada", "Zalun", "Lemyethna", "Myanaung", "Kyangin", "Ingapu"]),
  Labutta: lk(["Labutta", "Mawlamyinegyun"]),
  Maubin: lk(["Maubin", "Danubyu", "Nyaungdon", "Pantanaw"]),
  Myaungmya: lk(["Myaungmya", "Einme", "Wakema"]),
  Pathein: lk(["Pathein", "Kangyidaunt", "Thabaung", "Ngapudaw", "Kyonpyaw", "Yegyi", "Kyaunggon"]),
  Pyapon: lk(["Pyapon", "Bogale", "Dedaye", "Kyaiklat"]),
  // Bago
  Bago: lk(["Bago", "Thanatpin", "Kawa", "Waw", "Nyaunglebin", "Daik-U", "Shwegyin"]),
  Taungoo: lk(["Taungoo", "Yedashe", "Kyaukkyi", "Phyu", "Oktwin", "Htantabin"]),
  Pyay: lk(["Pyay", "Paungde", "Padaung", "Paukkhaung", "Shwedaung", "Thegon"]),
  Thayarwady: lk(["Thayarwady", "Letpadan", "Minhla", "Okpho", "Gyobingauk", "Zigon", "Nattalin", "Monyo"]),
  // Chin
  Falam: lk(["Falam"]),
  Hakha: lk(["Hakha", "Thantlang"]),
  Mindat: lk(["Mindat", "Kanpetlet"]),
  Matupi: lk(["Matupi", "Paletwa"]),
  Tedim: lk(["Tedim"]),
  Tonzang: lk(["Tonzang"]),
  // Kachin
  Bhamo: lk(["Bhamo", "Shwegu", "Momauk", "Mansi"]),
  Mohnyin: lk(["Mohnyin", "Mogaung", "Hpakant"]),
  Myitkyina: lk(["Myitkyina", "Waingmaw", "Tanai", "Chipwi", "Injangyang"]),
  "Puta-O": lk(["Puta-O", "Machanbaw", "Sumprabum", "Nogmung", "Khaunglanhpu"]),
  // Kayah
  Bawlakhe: lk(["Bawlakhe", "Hpasawng", "Mese"]),
  Loikaw: lk(["Loikaw", "Demoso", "Hpruso", "Shadaw"]),
  // Kayin
  "Hpa-An": lk(["Hpa-An", "Hlaingbwe", "Thandaunggyi"]),
  Hpapun: lk(["Hpapun"]),
  Kawkareik: lk(["Kawkareik", "Kyainseikgyi"]),
  Myawaddy: lk(["Myawaddy"]),
  // Magway
  Gangaw: lk(["Gangaw", "Saw", "Tilin"]),
  Magway: lk(["Magway", "Chauk", "Taungdwingyi", "Myothit", "Natmauk", "Yenangyaung"]),
  Minbu: lk(["Minbu", "Ngape", "Pwintbyu", "Salin", "Sidoktaya"]),
  Pakokku: lk(["Pakokku", "Myaing", "Pauk", "Seikphyu", "Yesagyo"]),
  Thayet: lk(["Thayet", "Aunglan", "Kamma", "Mindon", "Minhla", "Sinbaungwe"]),
  // Mandalay
  Kyaukse: lk(["Kyaukse", "Myittha", "Sintgaing", "Tada-U"]),
  Mandalay: lk(["Aungmyethazan", "Chanayethazan", "Chanmyathazi", "Mahaaungmye", "Pyigyidagun", "Amarapura", "Patheingyi"]),
  Meiktila: lk(["Meiktila", "Mahlaing", "Thazi", "Wundwin"]),
  Myingyan: lk(["Myingyan", "Natogyi", "Taungtha", "Ngazun"]),
  "Nyaung-U": lk(["Nyaung-U", "Kyaukpadaung"]),
  Pyinoolwin: lk(["Pyinoolwin", "Madaya", "Singu", "Thabeikkyin", "Mogok"]),
  Yamethin: lk(["Yamethin", "Pyawbwe"]),
  // Mon
  Mawlamyine: lk(["Mawlamyine", "Chaungzon", "Kyaikmaraw", "Mudon", "Thanbyuzayat", "Ye"]),
  Thaton: lk(["Thaton", "Bilin", "Kyaikto", "Paung"]),
  // Nay Pyi Taw
  "Det Khi Na": lk(["Zabuthiri", "Dekkhinathiri", "Lewe", "Pyinmana"]),
  "Oke Ta Ra": lk(["Ottarathiri", "Pobbathiri", "Zeyathiri", "Tatkon"]),
  // Rakhine
  Kyaukpyu: lk(["Kyaukpyu", "Ann", "Myebon", "Ramree"]),
  Maungdaw: lk(["Maungdaw", "Buthidaung"]),
  Sittwe: lk(["Sittwe", "Pauktaw", "Ponnagyun", "Rathedaung", "Myauk-U", "Kyauktaw", "Minbya", "Mrauk-U"]),
  Thandwe: lk(["Thandwe", "Gwa", "Toungup"]),
  // Sagaing
  Hkamti: lk(["Hkamti", "Homalin", "Lahe", "Layshi", "Nanyun"]),
  Kale: lk(["Kale", "Kalewa", "Mingin"]),
  Katha: lk(["Katha", "Banmauk", "Indaw", "Kawlin", "Pinlebu", "Tigyaing", "Wuntho"]),
  Mawlaik: lk(["Mawlaik", "Paungbyin"]),
  Monywa: lk(["Monywa", "Ayadaw", "Budalin", "Chaung-U"]),
  Sagaing: lk(["Sagaing", "Myaung", "Myinmu", "Shwebo"]),
  Shwebo: lk(["Shwebo", "Kanbalu", "Khin-U", "Tabayin", "Wetlet", "Ye-U"]),
  Tamu: lk(["Tamu"]),
  Yinmabin: lk(["Yinmabin", "Kani", "Pale", "Salingyi"]),
  // Shan
  Kengtung: lk(["Kengtung", "Mongkhet", "Mongla", "Mongyang"]),
  Kyaukme: lk(["Kyaukme", "Hsipaw", "Namtu", "Nawnghkio", "Mongmit", "Momeik"]),
  Lashio: lk(["Lashio", "Hseni", "Mongyai", "Tangyan"]),
  Langkho: lk(["Langkho", "Mawkmai", "Mongpan", "Hsihseng"]),
  Loilen: lk(["Loilen", "Kunhing", "Kyethi", "Laihka", "Mongkaung", "Namhsan", "Nansang"]),
  Muse: lk(["Muse", "Kutkai", "Namhkam", "Kunlong"]),
  Taunggyi: lk(["Taunggyi", "Hopong", "Kalaw", "Hsihseng", "Lawksawk", "Nyaungshwe", "Pekon", "Pindaya", "Ywangan"]),
  Tachileik: lk(["Tachileik", "Mongphyak", "Mongton", "Monghsat"]),
  // Tanintharyi
  Dawei: lk(["Dawei", "Launglon", "Thayetchaung", "Yebyu"]),
  Kawthaung: lk(["Kawthaung", "Bokpyin", "Khamaukgyi"]),
  Myeik: lk(["Myeik", "Kyunsu", "Palaw", "Tanintharyi"]),
  // Yangon
  "Yangon East": lk(["Botahtaung", "Dawbon", "Mingala Taungnyunt", "North Okkalapa", "Pazundaung", "South Okkalapa", "Thingangyun", "Tamwe", "Thakayta", "Dagon Myothit (East)", "Dagon Myothit (North)", "Dagon Myothit (Seikkan)", "Dagon Myothit (South)"]),
  "Yangon North": lk(["Insein", "Mingaladon", "Hlawga", "Hlegu", "Htantabin", "Shwepyithar", "Hlaingthaya", "Taikkyi", "Hmawbi"]),
  "Yangon South": lk(["Dala", "Seikgyikanaungto", "Cocokyun", "Kawhmu", "Kungyangon", "Kayan", "Thanlyin", "Kyauktan", "Thongwa", "Twante"]),
  "Yangon West": lk(["Ahlone", "Bahan", "Dagon", "Kyauktada", "Kyimyindaing", "Lanmadaw", "Latha", "Pabedan", "Sanchaung", "Seikkan", "Hlaing", "Kamayut", "Mayangon"]),
}

/** NRC region number → township codes issued under it. */
export type NrcCode = { region: number; code: string; label: string }

// ponytail: the official table has ~330 codes; these are the ones in common use.
// Add more as applications surface them — the free-text passport toggle is the escape hatch.
export const NRC_TOWNSHIP_CODES: NrcCode[] = [
  { region: 1, code: "MaKaNa", label: "Myitkyina" }, { region: 1, code: "BaMaNa", label: "Bhamo" },
  { region: 1, code: "MaKaTa", label: "Mogaung" }, { region: 1, code: "PaTaNa", label: "Puta-O" },
  { region: 2, code: "LaKaNa", label: "Loikaw" }, { region: 2, code: "BaLaKha", label: "Bawlakhe" },
  { region: 2, code: "DaMaSa", label: "Demoso" },
  { region: 3, code: "BaAhNa", label: "Hpa-An" }, { region: 3, code: "KaKaRa", label: "Kawkareik" },
  { region: 3, code: "MaWaTa", label: "Myawaddy" }, { region: 3, code: "HaPaNa", label: "Hpapun" },
  { region: 4, code: "HaKhaNa", label: "Hakha" }, { region: 4, code: "PhaLaNa", label: "Falam" },
  { region: 4, code: "MaTaNa", label: "Mindat" }, { region: 4, code: "TaZaNa", label: "Tonzang" },
  { region: 5, code: "MaRaNa", label: "Monywa" }, { region: 5, code: "SaKaNa", label: "Sagaing" },
  { region: 5, code: "KaLaNa", label: "Kale" }, { region: 5, code: "KaTaNa", label: "Katha" },
  { region: 5, code: "ShaTaNa", label: "Shwebo" }, { region: 5, code: "TaMaNa", label: "Tamu" },
  { region: 6, code: "DaWaNa", label: "Dawei" }, { region: 6, code: "MaAhNa", label: "Myeik" },
  { region: 6, code: "KaThaNa", label: "Kawthaung" },
  { region: 7, code: "BaTaHta", label: "Bago" }, { region: 7, code: "TaNgaNa", label: "Taungoo" },
  { region: 7, code: "PaMaNa", label: "Pyay" }, { region: 7, code: "ThaKaNa", label: "Thayarwady" },
  { region: 7, code: "YaTaNa", label: "Yedashe" }, { region: 7, code: "PaKhaNa", label: "Padaung" },
  { region: 8, code: "MaBaNa", label: "Magway" }, { region: 8, code: "PaKhaKa", label: "Pakokku" },
  { region: 8, code: "MaTaLa", label: "Minbu" }, { region: 8, code: "ThaYaNa", label: "Thayet" },
  { region: 8, code: "GaGaNa", label: "Gangaw" },
  { region: 9, code: "MaHaMa", label: "Mahaaungmye" }, { region: 9, code: "AhMaZa", label: "Amarapura" },
  { region: 9, code: "PaOoLa", label: "Pyinoolwin" }, { region: 9, code: "MaKaNa", label: "Meiktila" },
  { region: 9, code: "KaSaNa", label: "Kyaukse" }, { region: 9, code: "MaTaYa", label: "Madaya" },
  { region: 9, code: "YaMaSa", label: "Yamethin" }, { region: 9, code: "NgaZaNa", label: "Ngazun" },
  { region: 10, code: "MaLaMa", label: "Mawlamyine" }, { region: 10, code: "ThaHtaNa", label: "Thaton" },
  { region: 10, code: "MaDaNa", label: "Mudon" }, { region: 10, code: "BaLaNa", label: "Bilin" },
  { region: 11, code: "SaTaNa", label: "Sittwe" }, { region: 11, code: "KaPhaNa", label: "Kyaukpyu" },
  { region: 11, code: "ThaTaNa", label: "Thandwe" }, { region: 11, code: "MaThaNa", label: "Maungdaw" },
  { region: 12, code: "BaHaNa", label: "Bahan" }, { region: 12, code: "AhLaNa", label: "Ahlone" },
  { region: 12, code: "DaGaNa", label: "Dagon" }, { region: 12, code: "KaMaNa", label: "Kamayut" },
  { region: 12, code: "KaMaRa", label: "Kyimyindaing" }, { region: 12, code: "LaKaNa", label: "Lanmadaw" },
  { region: 12, code: "MaGaDa", label: "Mayangon" }, { region: 12, code: "SaKhaNa", label: "Sanchaung" },
  { region: 12, code: "OuKaMa", label: "Okkalapa" }, { region: 12, code: "TaMaNa", label: "Tamwe" },
  { region: 12, code: "ThaKaTa", label: "Thakayta" }, { region: 12, code: "ThaGaKa", label: "Thingangyun" },
  { region: 12, code: "PaBaTa", label: "Pabedan" }, { region: 12, code: "YaKaNa", label: "Insein" },
  { region: 12, code: "HlaTaNa", label: "Hlaingthaya" }, { region: 12, code: "DaPaNa", label: "Dagon Myothit" },
  { region: 13, code: "TaKaNa", label: "Taunggyi" }, { region: 13, code: "LaShaNa", label: "Lashio" },
  { region: 13, code: "KaMaNa", label: "Kyaukme" }, { region: 13, code: "MaYaNa", label: "Muse" },
  { region: 13, code: "KaTaNa", label: "Kengtung" }, { region: 13, code: "TaChaNa", label: "Tachileik" },
  { region: 13, code: "NyaLaNa", label: "Nyaungshwe" }, { region: 13, code: "KaLaWa", label: "Kalaw" },
  { region: 14, code: "PaTaNa", label: "Pathein" }, { region: 14, code: "HaThaTa", label: "Hinthada" },
  { region: 14, code: "MaAhNa", label: "Myaungmya" }, { region: 14, code: "PaThaNa", label: "Pyapon" },
  { region: 14, code: "MaMaNa", label: "Maubin" }, { region: 14, code: "LaPaTa", label: "Labutta" },
  { region: 14, code: "BaKaLa", label: "Bogale" }, { region: 14, code: "ZaLaNa", label: "Zalun" },
]

export const NRC_REGIONS: Lookup[] = Array.from({ length: 14 }, (_, i) => {
  const n = String(i + 1)
  return { value: n, label: n }
})

/** Bracketed citizenship type on an NRC. */
export const NRC_TYPES: Lookup[] = [
  { value: "N", label: "N — Naing (နိုင်)" },
  { value: "E", label: "E — Eain (ဧည့်)" },
  { value: "P", label: "P — Pyu (ပြု)" },
  { value: "TH", label: "TH — Thi (သီ)" },
  { value: "T", label: "T — Ta (တ)" },
  { value: "S", label: "S — Sa (စ)" },
  { value: "A", label: "A — Ah (အ)" },
]

export const NRC_RE = /^(?:[1-9]|1[0-4])\/[A-Za-z]{2,8}\((?:TH|[NEPTSA])\)\d{6}$/
// Passports: 1-2 letters + 6-8 digits covers MM (e.g. MA123456) and most foreign forms.
export const PASSPORT_RE = /^[A-Za-z]{1,2}\d{6,8}$/

export function buildNrc(p: { region: string; township: string; type: string; serial: string }): string {
  if (!p.region || !p.township || !p.type || !p.serial) return ""
  return `${p.region}/${p.township}(${p.type})${p.serial}`
}

/** Split a stored NRC back into its four parts, for hydrating the resubmit form. */
export function parseNrc(v: string): { region: string; township: string; type: string; serial: string } | null {
  const m = /^(\d{1,2})\/([A-Za-z]{2,8})\((TH|[NEPTSA])\)(\d{6})$/.exec(v.trim())
  return m ? { region: m[1], township: m[2], type: m[3], serial: m[4] } : null
}

/**
 * Canonicalize a Myanmar mobile number to +959XXXXXXX form.
 * Accepts 09…, 9…, 959…, +959…, with spaces or dashes. Returns null if unusable.
 */
export function normalizeMmPhone(raw: string): string | null {
  let d = raw.replace(/[^\d]/g, "")
  if (d.startsWith("95")) d = d.slice(2)
  if (d.startsWith("0")) d = d.slice(1)
  if (!/^9\d{6,10}$/.test(d)) return null
  return `+95${d}`
}

export const POSTAL_RE = /^\d{5}$/
