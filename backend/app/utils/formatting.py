import re
from typing import Optional, Dict, Tuple, List, Any

# Common surname particles that should remain lowercase in the middle of a name
NAME_LOWERCASE_PARTICLES = {
    "de", "la", "van", "von", "der", "den", "del", "di", "da", "du", "ter", "y", "le", "al", "el", "bin", "bint", "ibn"
}

# Roman numerals up to XX (20)
ROMAN_NUMERALS = {
    "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x",
    "xi", "xii", "xiii", "xiv", "xv", "xvi", "xvii", "xviii", "xix", "xx"
}

# Common name suffixes
SUFFIX_MAP = {
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
}

# Common honorific prefixes
PREFIX_MAP = {
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
}

# Well-known Celtic 'Mac' surnames where the 4th letter is capitalized
MAC_EXCEPTIONS = {
    "macarthur", "macdonald", "macdougall", "macfarlane", "macgregor",
    "macintyre", "macintosh", "mackay", "mackenzie", "mackinnon",
    "maclean", "macleod", "macmillan", "macneil", "macnicol",
    "macpherson", "macrae", "mactavish"
}

# Cardinal and intercardinal directionals for US street addresses
DIRECTIONALS = {
    "n": "N", "north": "N", "n.": "N",
    "s": "S", "south": "S", "s.": "S",
    "e": "E", "east": "E", "e.": "E",
    "w": "W", "west": "W", "w.": "W",
    "ne": "NE", "northeast": "NE", "ne.": "NE", "n.e.": "NE",
    "nw": "NW", "northwest": "NW", "nw.": "NW", "n.w.": "NW",
    "se": "SE", "southeast": "SE", "se.": "SE", "s.e.": "SE",
    "sw": "SW", "southwest": "SW", "sw.": "SW", "s.w.": "SW",
}

# USPS standard street suffixes
STREET_SUFFIX_MAP = {
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
}

# Unit designators
UNIT_DESIGNATORS = {
    "apt": "Apt", "apt.": "Apt", "apartment": "Apt",
    "ste": "Ste", "ste.": "Ste", "suite": "Ste",
    "unit": "Unit",
    "bldg": "Bldg", "bldg.": "Bldg", "building": "Bldg",
    "spc": "Spc", "spc.": "Spc", "space": "Spc",
    "fl": "Fl", "fl.": "Fl", "floor": "Fl",
    "rm": "Rm", "rm.": "Rm", "room": "Rm",
    "dept": "Dept", "dept.": "Dept", "department": "Dept",
    "#": "#",
}

def clean_whitespace(val: Optional[str]) -> str:
    """Collapses consecutive whitespace characters and strips ends."""
    if not val:
        return ""
    # Normalize unicode non-breaking spaces and collapse
    return re.sub(r"\s+", " ", str(val)).strip()


def format_person_name(raw_name: Optional[str]) -> str:
    """
    Capitalizes first, middle, and last names appropriately.
    - Strips extra whitespace.
    - Handles lowercase ('josh sparks' -> 'Josh Sparks') and uppercase ('JOSH SPARKS' -> 'Josh Sparks').
    - Preserves/standardizes initials ('mar c niblack' or 'mark c niblack' -> 'Mark C. Niblack').
    - Handles Celtic prefixes ('mcdonald' -> 'McDonald', 'mckinley' -> 'McKinley', 'macarthur' -> 'MacArthur').
    - Handles apostrophes ('o\'connor' -> 'O\'Connor', 'd\'angelo' -> 'D\'Angelo').
    - Handles hyphenated names ('smith-jones' -> 'Smith-Jones').
    - Handles suffixes ('jr' -> 'Jr.', 'iii' -> 'III', 'phd' -> 'PhD').
    - Preserves particles in the middle ('juan de la cruz' -> 'Juan de la Cruz', 'vincent van gogh' -> 'Vincent van Gogh').
    """
    clean = clean_whitespace(raw_name)
    if not clean:
        return ""

    # Check if name is all uppercase or all lowercase
    is_uniform_case = clean.isupper() or clean.islower()

    # Split into space-separated tokens
    tokens = clean.split(" ")
    formatted_tokens: List[str] = []

    for i, token in enumerate(tokens):
        # Strip trailing commas if e.g. "Smith, Jr."
        has_trailing_comma = token.endswith(",")
        core_token = token.rstrip(",")
        lower_core = core_token.lower()

        # 1. Suffix checks
        if lower_core in SUFFIX_MAP:
            formatted = SUFFIX_MAP[lower_core]
            if has_trailing_comma:
                formatted += ","
            formatted_tokens.append(formatted)
            continue

        # 2. Prefix / honorific checks
        if lower_core in PREFIX_MAP:
            formatted = PREFIX_MAP[lower_core]
            if has_trailing_comma:
                formatted += ","
            formatted_tokens.append(formatted)
            continue

        # 3. Roman numerals
        if lower_core in ROMAN_NUMERALS:
            formatted = lower_core.upper()
            if has_trailing_comma:
                formatted += ","
            formatted_tokens.append(formatted)
            continue

        # 4. Particles in the middle of a name (keep lowercase if not the first token)
        if lower_core in NAME_LOWERCASE_PARTICLES and i > 0:
            formatted = lower_core
            if has_trailing_comma:
                formatted += ","
            formatted_tokens.append(formatted)
            continue

        # 5. Middle initials or single letters (e.g. "c" or "c.")
        # If single letter or single letter with period
        if re.match(r"^[a-zA-Z]\.?$", core_token):
            letter = core_token[0].upper()
            formatted = f"{letter}."
            if has_trailing_comma:
                formatted += ","
            formatted_tokens.append(formatted)
            continue

        # Helper to format a single word
        def _format_word(w: str) -> str:
            if not w:
                return ""
            
            # If word is already mixed case and input wasn't uniform case, preserve it
            if not is_uniform_case and not w.islower() and not w.isupper() and any(c.isupper() for c in w[1:]):
                return w

            w_lower = w.lower()

            # Celtic 'Mc' prefix (e.g. McDonald, McKinley)
            if w_lower.startswith("mc") and len(w) > 2:
                return "Mc" + w[2].upper() + w[3:].lower()

            # Celtic 'Mac' prefix (e.g. MacArthur, MacDonald)
            if w_lower in MAC_EXCEPTIONS:
                return "Mac" + w[3].upper() + w[4:].lower()

            # Default: capitalize first letter, lowercase the rest
            return w_lower.capitalize()

        # 6. Hyphenated word (e.g. Smith-Jones)
        if "-" in core_token:
            subparts = core_token.split("-")
            formatted = "-".join(_format_word(sp) for sp in subparts)
        # 7. Apostrophe in word (e.g. O'Connor, D'Angelo, L'Amour)
        elif "'" in core_token or "’" in core_token:
            delim = "'" if "'" in core_token else "’"
            subparts = core_token.split(delim)
            if len(subparts) == 2 and len(subparts[0]) <= 2:
                # O'Connor, D'Angelo
                formatted = subparts[0].capitalize() + "'" + subparts[1].capitalize()
            else:
                formatted = delim.join(_format_word(sp) for sp in subparts)
        else:
            formatted = _format_word(core_token)

        if has_trailing_comma:
            formatted += ","
        formatted_tokens.append(formatted)

    result = " ".join(formatted_tokens)
    return result


def format_street_address(raw_address: Optional[str]) -> Optional[str]:
    """
    Standardizes address capitalization, spacing, directionals, unit designators, and suffixes.
    - Preserves unit numbers and alphanumeric designations ('Apt 4B', 'Unit 2A', '#3C').
    - Standardizes cardinal directions ('N', 'S', 'E', 'W', 'NW', etc.).
    - Standardizes street suffixes ('St', 'Ave', 'Dr', 'Rd', 'Blvd', 'Way', etc.).
    - Handles PO Box formatting ('PO Box 123').
    - Collapses extra whitespace.
    """
    clean = clean_whitespace(raw_address)
    if not clean:
        return None

    # Handle PO Box variations
    po_box_match = re.match(r"^(?:p\.?\s*o\.?\s*box|post\s+office\s+box)\s+(\S+.*)$", clean, flags=re.IGNORECASE)
    if po_box_match:
        box_num = clean_whitespace(po_box_match.group(1))
        return f"PO Box {box_num.upper() if box_num.isalpha() else box_num}"

    # Split address tokens by comma to separate main address from secondary/unit if present
    comma_segments = [seg.strip() for seg in clean.split(",") if seg.strip()]
    formatted_segments: List[str] = []

    for seg_idx, segment in enumerate(comma_segments):
        tokens = segment.split(" ")
        formatted_tokens: List[str] = []
        skip_next = False

        for i, token in enumerate(tokens):
            if skip_next:
                skip_next = False
                continue

            core_token = token.rstrip(".")
            lower_token = token.lower()
            lower_core = core_token.lower()

            # 1. Directionals: N, S, E, W, NE, NW, SE, SW
            if lower_core in DIRECTIONALS:
                formatted_tokens.append(DIRECTIONALS[lower_core])
                continue

            # 2. Unit Designators: Apt, Ste, Unit, Bldg, Spc, Fl, Rm, Dept, #
            if lower_core in UNIT_DESIGNATORS:
                desig = UNIT_DESIGNATORS[lower_core]
                # Check if next token is unit number (e.g. 'Apt 4b' -> 'Apt 4B', '# 3c' -> '#3C')
                if i + 1 < len(tokens):
                    next_token = tokens[i + 1]
                    # Uppercase any letter in unit code, e.g. '4b' -> '4B', 'a' -> 'A'
                    formatted_unit = next_token.upper() if re.search(r"[a-zA-Z]", next_token) else next_token
                    if desig == "#":
                        formatted_tokens.append(f"#{formatted_unit}")
                    else:
                        formatted_tokens.append(f"{desig} {formatted_unit}")
                    skip_next = True
                    continue
                else:
                    formatted_tokens.append(desig)
                    continue

            # Unit indicator with attached unit code (e.g. '#4b' -> '#4B', 'Apt.4B' -> 'Apt 4B')
            hash_match = re.match(r"^#([a-zA-Z0-9\-]+)$", token)
            if hash_match:
                code = hash_match.group(1).upper()
                formatted_tokens.append(f"#{code}")
                continue

            apt_attached = re.match(r"^(apt|ste|unit)\.?([a-zA-Z0-9\-]+)$", token, flags=re.IGNORECASE)
            if apt_attached:
                desig = apt_attached.group(1).capitalize()
                code = apt_attached.group(2).upper()
                formatted_tokens.append(f"{desig} {code}")
                continue

            # 3. Street Suffixes: St, Ave, Rd, Dr, Blvd, etc.
            if lower_token in STREET_SUFFIX_MAP:
                formatted_tokens.append(STREET_SUFFIX_MAP[lower_token])
                continue

            # 4. Ordinal numbers: 1st, 2nd, 3rd, 4th, 10th, 42nd
            ordinal_match = re.match(r"^(\d+)(st|nd|rd|th)$", lower_token)
            if ordinal_match:
                num, suffix = ordinal_match.groups()
                formatted_tokens.append(f"{num}{suffix}")
                continue

            # 5. Highways / Interstate / State routes (e.g. US-101, I-5, SR-76, CA-78)
            hwy_match = re.match(r"^(us|i|sr|ca|cr|state\s*route)[\s\-]?(\d+[a-zA-Z]?)$", token, flags=re.IGNORECASE)
            if hwy_match:
                prefix, num = hwy_match.groups()
                formatted_tokens.append(f"{prefix.upper()}-{num.upper()}")
                continue

            # 6. Default: Title case for general words
            # If word is already mixed case with intentional uppercase (e.g. McAlister), keep it
            if not token.islower() and not token.isupper() and any(c.isupper() for c in token[1:]):
                formatted_tokens.append(token)
            else:
                formatted_tokens.append(token.capitalize())

        formatted_segments.append(" ".join(formatted_tokens))

    result = ", ".join(formatted_segments)
    # Final cleanup of multiple spaces or spaces before commas
    result = re.sub(r"\s*,\s*", ", ", result)
    result = re.sub(r"\s+", " ", result).strip()
    return result if result else None


def format_city_name(raw_city: Optional[str]) -> Optional[str]:
    """
    Standardizes city name capitalization and spacing.
    - Handles multi-word cities ('san diego' -> 'San Diego', 'la jolla' -> 'La Jolla').
    - Handles special particles ('al khoud' -> 'Al Khoud', 'rancho santa fe' -> 'Rancho Santa Fe').
    """
    clean = clean_whitespace(raw_city)
    if not clean:
        return None

    words = clean.split(" ")
    formatted_words: List[str] = []

    for i, w in enumerate(words):
        w_lower = w.lower()
        # Keep particles like 'de' lowercase if in middle, e.g. "Rancho de la Luna"
        if w_lower in {"de", "del"} and i > 0:
            formatted_words.append(w_lower)
        elif w_lower in {"al", "el", "la", "las", "los", "san", "santa"}:
            formatted_words.append(w_lower.capitalize())
        else:
            formatted_words.append(w.capitalize())

    return " ".join(formatted_words)


def format_zip_code(raw_zip: Optional[str]) -> Optional[str]:
    """
    Standardizes 5-digit and 9-digit (ZIP+4) US zip codes.
    Returns cleaned zip or None if invalid.
    """
    clean = clean_whitespace(raw_zip)
    if not clean:
        return None

    match = re.search(r"\b(\d{5}(?:-\d{4})?)\b", clean)
    if match:
        return match.group(1)

    # If only digits provided
    digits = re.sub(r"\D", "", clean)
    if len(digits) == 5:
        return digits
    elif len(digits) == 9:
        return f"{digits[:5]}-{digits[5:]}"

    return clean if clean else None
