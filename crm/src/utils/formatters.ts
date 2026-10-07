/**
 * Text and Data Formatting Utilities for Rise Up Roofing CRM
 * Provides consistent formatting for names, addresses, cities, and zip codes.
 */

// Common surname particles that should remain lowercase in the middle of a name
const NAME_LOWERCASE_PARTICLES = new Set([
  "de", "la", "van", "von", "der", "den", "del", "di", "da", "du", "ter", "y", "le", "al", "el", "bin", "bint", "ibn"
]);

// Roman numerals up to XX (20)
const ROMAN_NUMERALS = new Set([
  "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x",
  "xi", "xii", "xiii", "xiv", "xv", "xvi", "xvii", "xviii", "xix", "xx"
]);

// Common name suffixes
const SUFFIX_MAP: Record<string, string> = {
  "jr": "Jr.",
  "jr.": "Jr.",
  "sr": "Sr.",
  "sr.": "Sr.",
  "esq": "Esq.",
  "esq.": "Esq.",
  "ii": "II",
  "iii": "III",
  "iv": "IV",
  "v": "V",
  "vi": "VI",
  "vii": "VII",
  "viii": "VIII",
  "ix": "IX",
  "x": "X",
  "md": "MD",
  "m.d.": "MD",
  "dds": "DDS",
  "d.d.s.": "DDS",
  "phd": "PhD",
  "ph.d.": "PhD",
  "dvm": "DVM",
  "rn": "RN",
  "cpa": "CPA",
  "pe": "PE",
};

// Common honorific prefixes
const PREFIX_MAP: Record<string, string> = {
  "mr": "Mr.",
  "mr.": "Mr.",
  "mrs": "Mrs.",
  "mrs.": "Mrs.",
  "ms": "Ms.",
  "ms.": "Ms.",
  "dr": "Dr.",
  "dr.": "Dr.",
  "prof": "Prof.",
  "prof.": "Prof.",
  "rev": "Rev.",
  "rev.": "Rev.",
  "st": "St.",
  "st.": "St.",
};

// Well-known Celtic 'Mac' surnames
const MAC_EXCEPTIONS = new Set([
  "macarthur", "macdonald", "macdougall", "macfarlane", "macgregor",
  "macintyre", "macintosh", "mackay", "mackenzie", "mackinnon",
  "maclean", "macleod", "macmillan", "macneil", "macnicol",
  "macpherson", "macrae", "mactavish"
]);

// Directionals
const DIRECTIONALS: Record<string, string> = {
  "n": "N", "north": "N", "n.": "N",
  "s": "S", "south": "S", "s.": "S",
  "e": "E", "east": "E", "e.": "E",
  "w": "W", "west": "W", "w.": "W",
  "ne": "NE", "northeast": "NE", "ne.": "NE", "n.e.": "NE",
  "nw": "NW", "northwest": "NW", "nw.": "NW", "n.w.": "NW",
  "se": "SE", "southeast": "SE", "se.": "SE", "s.e.": "SE",
  "sw": "SW", "southwest": "SW", "sw.": "SW", "s.w.": "SW",
};

// USPS standard street suffixes
const STREET_SUFFIX_MAP: Record<string, string> = {
  "st": "St", "st.": "St", "street": "St",
  "ave": "Ave", "ave.": "Ave", "avenue": "Ave",
  "rd": "Rd", "rd.": "Rd", "road": "Rd",
  "dr": "Dr", "dr.": "Dr", "drive": "Dr",
  "blvd": "Blvd", "blvd.": "Blvd", "boulevard": "Blvd",
  "ln": "Ln", "ln.": "Ln", "lane": "Ln",
  "ct": "Ct", "ct.": "Ct", "court": "Ct",
  "cir": "Cir", "cir.": "Cir", "circle": "Cir",
  "pl": "Pl", "pl.": "Pl", "place": "Pl",
  "pkwy": "Pkwy", "pkwy.": "Pkwy", "parkway": "Pkwy",
  "way": "Way", "wy": "Way",
  "hwy": "Hwy", "hwy.": "Hwy", "highway": "Hwy",
  "trl": "Trl", "trl.": "Trl", "trail": "Trl",
  "ter": "Ter", "ter.": "Ter", "terr": "Ter", "terrace": "Ter",
  "loop": "Loop",
  "walk": "Walk",
  "cswy": "Cswy", "causeway": "Cswy",
  "path": "Path",
  "run": "Run",
  "row": "Row",
  "sq": "Sq", "square": "Sq",
  "aly": "Aly", "alley": "Aly",
  "xing": "Xing", "crossing": "Xing",
};

// Unit designators
const UNIT_DESIGNATORS: Record<string, string> = {
  "apt": "Apt", "apt.": "Apt", "apartment": "Apt",
  "ste": "Ste", "ste.": "Ste", "suite": "Ste",
  "unit": "Unit",
  "bldg": "Bldg", "bldg.": "Bldg", "building": "Bldg",
  "spc": "Spc", "spc.": "Spc", "space": "Spc",
  "fl": "Fl", "fl.": "Fl", "floor": "Fl",
  "rm": "Rm", "rm.": "Rm", "room": "Rm",
  "dept": "Dept", "dept.": "Dept", "department": "Dept",
  "#": "#",
};

/**
 * Collapses consecutive whitespace characters and strips ends.
 */
export function cleanWhitespace(val: string | null | undefined): string {
  if (!val) return "";
  return String(val).replace(/\s+/g, " ").trim();
}

/**
 * Capitalizes first, middle, and last names appropriately.
 * Handles casing, suffixes, Roman numerals, initials, Celtic names, apostrophes, hyphens, and particles.
 */
export function formatPersonName(rawName: string | null | undefined): string {
  const clean = cleanWhitespace(rawName);
  if (!clean) return "";

  const isUniformCase = clean === clean.toUpperCase() || clean === clean.toLowerCase();
  const tokens = clean.split(" ");
  const formattedTokens: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const hasTrailingComma = token.endsWith(",");
    const coreToken = token.replace(/,+$/, "");
    const lowerCore = coreToken.toLowerCase();

    // 1. Suffix checks
    if (SUFFIX_MAP[lowerCore]) {
      let formatted = SUFFIX_MAP[lowerCore];
      if (hasTrailingComma) formatted += ",";
      formattedTokens.push(formatted);
      continue;
    }

    // 2. Prefix / honorific checks
    if (PREFIX_MAP[lowerCore]) {
      let formatted = PREFIX_MAP[lowerCore];
      if (hasTrailingComma) formatted += ",";
      formattedTokens.push(formatted);
      continue;
    }

    // 3. Roman numerals
    if (ROMAN_NUMERALS.has(lowerCore)) {
      let formatted = lowerCore.toUpperCase();
      if (hasTrailingComma) formatted += ",";
      formattedTokens.push(formatted);
      continue;
    }

    // 4. Particles in the middle of a name
    if (NAME_LOWERCASE_PARTICLES.has(lowerCore) && i > 0) {
      let formatted = lowerCore;
      if (hasTrailingComma) formatted += ",";
      formattedTokens.push(formatted);
      continue;
    }

    // 5. Middle initials or single letters
    if (/^[a-zA-Z]\.?$/.test(coreToken)) {
      let formatted = `${coreToken[0].toUpperCase()}.`;
      if (hasTrailingComma) formatted += ",";
      formattedTokens.push(formatted);
      continue;
    }

    // Helper for single word formatting
    const formatWord = (w: string): string => {
      if (!w) return "";
      // If word is already mixed case and input wasn't uniform case, preserve it
      if (!isUniformCase && w !== w.toLowerCase() && w !== w.toUpperCase() && /[A-Z]/.test(w.slice(1))) {
        return w;
      }
      const wLower = w.toLowerCase();
      // Celtic 'Mc' prefix
      if (wLower.startsWith("mc") && w.length > 2) {
        return "Mc" + w[2].toUpperCase() + w.slice(3).toLowerCase();
      }
      // Celtic 'Mac' exceptions
      if (MAC_EXCEPTIONS.has(wLower)) {
        return "Mac" + w[3].toUpperCase() + w.slice(4).toLowerCase();
      }
      // Default: Capitalize first letter
      return wLower.charAt(0).toUpperCase() + wLower.slice(1);
    };

    let formatted = "";
    if (coreToken.includes("-")) {
      formatted = coreToken.split("-").map(formatWord).join("-");
    } else if (coreToken.includes("'") || coreToken.includes("’")) {
      const delim = coreToken.includes("'") ? "'" : "’";
      const parts = coreToken.split(delim);
      if (parts.length === 2 && parts[0].length <= 2) {
        formatted = formatWord(parts[0]) + "'" + formatWord(parts[1]);
      } else {
        formatted = parts.map(formatWord).join(delim);
      }
    } else {
      formatted = formatWord(coreToken);
    }

    if (hasTrailingComma) formatted += ",";
    formattedTokens.push(formatted);
  }

  return formattedTokens.join(" ");
}

/**
 * Standardizes address capitalization, spacing, directionals, unit designators, and suffixes.
 */
export function formatStreetAddress(rawAddress: string | null | undefined): string {
  const clean = cleanWhitespace(rawAddress);
  if (!clean) return "";

  // PO Box
  const poBoxMatch = clean.match(/^(?:p\.?\s*o\.?\s*box|post\s+office\s+box)\s+(\S+.*)$/i);
  if (poBoxMatch) {
    const boxNum = cleanWhitespace(poBoxMatch[1]);
    return `PO Box ${/^[a-zA-Z]+$/.test(boxNum) ? boxNum.toUpperCase() : boxNum}`;
  }

  const commaSegments = clean.split(",").map(s => s.trim()).filter(Boolean);
  const formattedSegments: string[] = [];

  for (const segment of commaSegments) {
    const tokens = segment.split(" ");
    const formattedTokens: string[] = [];
    let skipNext = false;

    for (let i = 0; i < tokens.length; i++) {
      if (skipNext) {
        skipNext = false;
        continue;
      }
      const token = tokens[i];
      const coreToken = token.replace(/\.+$/, "");
      const lowerToken = token.toLowerCase();
      const lowerCore = coreToken.toLowerCase();

      // 1. Directionals
      if (DIRECTIONALS[lowerCore]) {
        formattedTokens.push(DIRECTIONALS[lowerCore]);
        continue;
      }

      // 2. Unit Designators
      if (UNIT_DESIGNATORS[lowerCore]) {
        const desig = UNIT_DESIGNATORS[lowerCore];
        if (i + 1 < tokens.length) {
          const nextToken = tokens[i + 1];
          const formattedUnit = /[a-zA-Z]/.test(nextToken) ? nextToken.toUpperCase() : nextToken;
          if (desig === "#") {
            formattedTokens.push(`#${formattedUnit}`);
          } else {
            formattedTokens.push(`${desig} ${formattedUnit}`);
          }
          skipNext = true;
          continue;
        } else {
          formattedTokens.push(desig);
          continue;
        }
      }

      // Unit with attached hash/code
      const hashMatch = token.match(/^#([a-zA-Z0-9\-]+)$/);
      if (hashMatch) {
        formattedTokens.push(`#${hashMatch[1].toUpperCase()}`);
        continue;
      }

      const aptAttached = token.match(/^(apt|ste|unit)\.?([a-zA-Z0-9\-]+)$/i);
      if (aptAttached) {
        const desig = aptAttached[1].charAt(0).toUpperCase() + aptAttached[1].slice(1).toLowerCase();
        formattedTokens.push(`${desig} ${aptAttached[2].toUpperCase()}`);
        continue;
      }

      // 3. Street Suffixes
      if (STREET_SUFFIX_MAP[lowerToken]) {
        formattedTokens.push(STREET_SUFFIX_MAP[lowerToken]);
        continue;
      }

      // 4. Ordinals: 1st, 2nd, etc.
      const ordinalMatch = lowerToken.match(/^(\d+)(st|nd|rd|th)$/);
      if (ordinalMatch) {
        formattedTokens.push(`${ordinalMatch[1]}${ordinalMatch[2]}`);
        continue;
      }

      // 5. Highway / Route
      const hwyMatch = token.match(/^(us|i|sr|ca|cr|state\s*route)[\s\-]?(\d+[a-zA-Z]?)$/i);
      if (hwyMatch) {
        formattedTokens.push(`${hwyMatch[1].toUpperCase()}-${hwyMatch[2].toUpperCase()}`);
        continue;
      }

      // 6. Default
      if (token !== token.toLowerCase() && token !== token.toUpperCase() && /[A-Z]/.test(token.slice(1))) {
        formattedTokens.push(token);
      } else {
        formattedTokens.push(token.charAt(0).toUpperCase() + token.slice(1).toLowerCase());
      }
    }
    formattedSegments.push(formattedTokens.join(" "));
  }

  let result = formattedSegments.join(", ");
  result = result.replace(/\s*,\s*/g, ", ").replace(/\s+/g, " ").trim();
  return result;
}

/**
 * Standardizes city name capitalization and spacing.
 */
export function formatCityName(rawCity: string | null | undefined): string {
  const clean = cleanWhitespace(rawCity);
  if (!clean) return "";

  const words = clean.split(" ");
  const formattedWords: string[] = [];

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const wLower = w.toLowerCase();
    if ((wLower === "de" || wLower === "del") && i > 0) {
      formattedWords.push(wLower);
    } else if (["al", "el", "la", "las", "los", "san", "santa"].includes(wLower)) {
      formattedWords.push(wLower.charAt(0).toUpperCase() + wLower.slice(1));
    } else {
      formattedWords.push(wLower.charAt(0).toUpperCase() + wLower.slice(1));
    }
  }

  return formattedWords.join(" ");
}

/**
 * Standardizes 5-digit and 9-digit (ZIP+4) US zip codes.
 */
export function formatZipCode(rawZip: string | null | undefined): string {
  const clean = cleanWhitespace(rawZip);
  if (!clean) return "";

  const match = clean.match(/\b(\d{5}(?:-\d{4})?)\b/);
  if (match) {
    return match[1];
  }

  const digits = clean.replace(/\D/g, "");
  if (digits.length === 5) {
    return digits;
  }
  if (digits.length === 9) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }

  return clean;
}
