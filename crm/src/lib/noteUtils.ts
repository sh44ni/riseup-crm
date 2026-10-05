/**
 * Rise Up CRM — Note Utilities
 * Formatting, 12-hour timestamp generation, and profile-based note serialization & parsing.
 */

export interface ParsedProfileNote {
  id: string;
  author: string;
  role?: string;
  timestamp: string;
  content: string;
  initials: string;
  avatarUrl?: string;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Formats any Date or timestamp string into a clean 12-hour format:
 * e.g. "Sep 18, 2026 • 10:25 AM"
 */
export function formatTimestamp12h(input?: Date | string | number | null): string {
  let d: Date;
  if (!input) {
    d = new Date();
  } else if (input instanceof Date) {
    d = input;
  } else if (typeof input === 'number') {
    d = new Date(input);
  } else {
    // String parsing
    const parsed = new Date(input);
    d = isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  const month = MONTH_NAMES[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  return `${month} ${day}, ${year} • ${hours}:${minutes} ${ampm}`;
}

/**
 * Extracts 2-letter uppercase initials from an author name
 */
export function getAuthorInitials(name?: string | null): string {
  if (!name || typeof name !== 'string' || !name.trim()) return 'RU';
  // Strip out parenthesis like "(Owner)"
  const cleanName = name.replace(/\([^)]*\)/g, '').trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'RU';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Returns deterministic pleasant gradient colors for an author's initials avatar
 */
export function getAuthorColor(name?: string): {
  bg: string;
  text: string;
  border: string;
  avatarBg: string;
} {
  const palettes = [
    {
      bg: 'bg-sky-50/80',
      text: 'text-sky-700',
      border: 'border-sky-200',
      avatarBg: 'bg-gradient-to-br from-sky-500 to-blue-600 text-white',
    },
    {
      bg: 'bg-indigo-50/80',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      avatarBg: 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white',
    },
    {
      bg: 'bg-emerald-50/80',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      avatarBg: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
    },
    {
      bg: 'bg-amber-50/80',
      text: 'text-amber-800',
      border: 'border-amber-200',
      avatarBg: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white',
    },
    {
      bg: 'bg-purple-50/80',
      text: 'text-purple-700',
      border: 'border-purple-200',
      avatarBg: 'bg-gradient-to-br from-purple-500 to-pink-600 text-white',
    },
  ];

  if (!name) return palettes[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % palettes.length;
  return palettes[index];
}

/**
 * Sanitizes author names to ensure they represent real human team members
 * and never raw API tokens like 'APIKey: CRM frontend'
 */
export function cleanseAuthor(rawAuthor?: string | null, rawRole?: string | null): { name: string; role?: string } {
  const authorStr = (rawAuthor || '').trim();
  const lower = authorStr.toLowerCase();

  if (
    !authorStr ||
    lower.includes('apikey') ||
    lower.includes('api_client') ||
    lower.includes('crm frontend') ||
    lower === 'api'
  ) {
    return { name: 'Marc Sarellano', role: 'Owner' };
  }

  let cleanRole = rawRole ? rawRole.trim() : undefined;
  if (cleanRole && cleanRole.toLowerCase().includes('api_client')) {
    cleanRole = 'Owner';
  }

  return { name: authorStr, role: cleanRole };
}

/**
 * Formats a note string for persistence with profile header:
 * e.g. "[Sep 18, 2026 • 10:25 AM — Marc Sarellano (Owner)]\nInspection completed..."
 */
export function serializeProfileNote(
  content: string,
  authorName: string = 'Marc Sarellano',
  authorRole?: string,
  date: Date = new Date()
): string {
  const clean = cleanseAuthor(authorName, authorRole);
  const timestamp = formatTimestamp12h(date);
  const roleSuffix = clean.role && !clean.name.includes('(') ? ` (${clean.role})` : '';
  const header = `[${timestamp} — ${clean.name}${roleSuffix}]`;
  return `${header}\n${content.trim()}`;
}

/**
 * Parses raw stored notes text into a list of structured profile notes.
 * Robust against legacy bullet points, raw unformatted text, and serialized headers.
 */
export function parseProfileNotes(rawNotes: any): ParsedProfileNote[] {
  if (!rawNotes) {
    return [];
  }
  const strVal = typeof rawNotes === 'string' ? rawNotes : typeof rawNotes === 'object' ? JSON.stringify(rawNotes) : String(rawNotes);
  if (!strVal.trim()) {
    return [];
  }

  const trimmed = strVal.trim();

  // Strict pattern matches note headers like:
  // [Sep 18, 2026 • 10:25 AM — Marc Sarellano (Owner)]
  // [Sep 18, 2026 10:25 AM by Marc]
  // [48h Automated Rule]: ...
  const headerRegex = /\[((?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4}-\d{2}-\d{2})[^\n\]]+|(?:(?:\d+h\s+)?Automated Rule|System|Audit)[^\n\]]*))\]/gi;
  const matches = [...trimmed.matchAll(headerRegex)];

  if (matches.length > 0) {
    const notes: ParsedProfileNote[] = [];

    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i];
      const headerContent = currentMatch[1];
      const startIndex = currentMatch.index! + currentMatch[0].length;
      const endIndex = i + 1 < matches.length ? matches[i + 1].index! : trimmed.length;

      let body = trimmed.slice(startIndex, endIndex).trim();
      // Clean leading colon or newlines
      if (body.startsWith(':')) body = body.slice(1).trim();

      // Deconstruct headerContent: e.g. "Sep 18, 2026 • 10:25 AM — Marc Sarellano (Owner)"
      let author = 'Team Member';
      let role: string | undefined = undefined;
      let timestamp = formatTimestamp12h(new Date());

      if (headerContent.includes('—')) {
        const parts = headerContent.split('—');
        timestamp = parts[0].trim();
        const authorPart = parts[1].trim();

        const roleMatch = authorPart.match(/\(([^)]+)\)/);
        if (roleMatch) {
          role = roleMatch[1].trim();
          author = authorPart.replace(/\([^)]+\)/, '').trim();
        } else {
          author = authorPart;
          role = undefined;
        }
      } else if (headerContent.includes('•') && (headerContent.match(/•/g) || []).length >= 2) {
        // e.g. "Sep 19, 2026 • 4:48 AM • Marc Sarellano (Owner)"
        const lastBullet = headerContent.lastIndexOf('•');
        timestamp = headerContent.slice(0, lastBullet).trim();
        const authorPart = headerContent.slice(lastBullet + 1).trim();

        const roleMatch = authorPart.match(/\(([^)]+)\)/);
        if (roleMatch) {
          role = roleMatch[1].trim();
          author = authorPart.replace(/\([^)]+\)/, '').trim();
        } else {
          author = authorPart;
          role = undefined;
        }
      } else if (headerContent.includes(' by ')) {
        const parts = headerContent.split(' by ');
        timestamp = parts[0].trim();
        author = parts[1].trim();
        role = 'Team Member';
      } else if (headerContent.includes('Automated Rule') || headerContent.includes('System')) {
        author = 'Rise Up System';
        role = 'Automation Engine';
        timestamp = formatTimestamp12h(new Date());
      } else {
        // Fallback
        timestamp = headerContent.trim();
        author = 'Team Note';
        role = undefined;
      }

      const cleaned = cleanseAuthor(author, role);
      notes.push({
        id: `note-${i}-${Date.now()}`,
        author: cleaned.name,
        role: cleaned.role,
        timestamp,
        content: body || '(No note details recorded)',
        initials: getAuthorInitials(cleaned.name),
      });
    }

    return notes.reverse(); // Most recent first
  }

  // Legacy fallback: If notes contain bullet points "• " or double newlines
  const lines = trimmed
    .split(/\n\s*•|\n\n/)
    .map((l) => l.replace(/^•\s*/, '').trim())
    .filter(Boolean);

  if (lines.length > 1) {
    return lines
      .map((line, idx) => ({
        id: `legacy-${idx}`,
        author: 'Team Member',
        role: 'Field Team',
        timestamp: formatTimestamp12h(new Date()),
        content: line,
        initials: 'TM',
      }))
      .reverse();
  }

  // Single monolithic note
  return [
    {
      id: `note-single-${Date.now()}`,
      author: 'Team Note',
      role: undefined,
      timestamp: formatTimestamp12h(new Date()),
      content: trimmed,
      initials: 'TN',
    },
  ];
}

/**
 * Reserializes an array of ParsedProfileNote items (typically displayed newest-first)
 * into a standard database string formatted in chronological order (oldest first).
 */
export function reserializeProfileNotes(notesList: ParsedProfileNote[]): string {
  if (!notesList || notesList.length === 0) return '';
  // Reverse newest-first display order to chronological storage order
  const chronological = [...notesList].reverse();
  return chronological
    .map((n) => {
      const clean = cleanseAuthor(n.author, n.role);
      const roleSuffix = clean.role && !clean.name.includes('(') ? ` (${clean.role})` : '';
      const header = `[${n.timestamp} — ${clean.name}${roleSuffix}]`;
      return `${header}\n${n.content.trim()}`;
    })
    .join('\n\n');
}

