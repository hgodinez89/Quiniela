// Mapeo de códigos FIFA (nuestra tabla `teams.code`) a códigos ISO usados por
// flagcdn.com. Inglaterra/Escocia usan subdivisiones (gb-eng, gb-sct).
const FIFA_TO_ISO: Record<string, string> = {
  MEX: "mx", RSA: "za", KOR: "kr", CZE: "cz",
  CAN: "ca", BIH: "ba", QAT: "qa", SUI: "ch",
  BRA: "br", MAR: "ma", HAI: "ht", SCO: "gb-sct",
  USA: "us", PAR: "py", AUS: "au", TUR: "tr",
  GER: "de", CUW: "cw", CIV: "ci", ECU: "ec",
  NED: "nl", JPN: "jp", SWE: "se", TUN: "tn",
  BEL: "be", EGY: "eg", IRN: "ir", NZL: "nz",
  ESP: "es", CPV: "cv", KSA: "sa", URU: "uy",
  FRA: "fr", SEN: "sn", IRQ: "iq", NOR: "no",
  ARG: "ar", ALG: "dz", AUT: "at", JOR: "jo",
  POR: "pt", COD: "cd", UZB: "uz", COL: "co",
  ENG: "gb-eng", CRO: "hr", GHA: "gh", PAN: "pa",
};

export function flagIso(code: string | null | undefined): string | null {
  if (!code) return null;
  return FIFA_TO_ISO[code] ?? null;
}

// flagcdn: imágenes por altura fija (hNN). Para retina usamos 1x/2x.
export function flagUrl(iso: string, height = 20): string {
  return `https://flagcdn.com/h${height}/${iso}.png`;
}
