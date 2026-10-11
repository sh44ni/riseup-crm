/**
 * Company signature access levels (per role).
 *
 * Levels are hierarchical: `edit` ⊃ `use` ⊃ `view` ⊃ `none`.
 * - view: see the company contractor signature
 * - use:  counter-sign contracts with it
 * - edit: set up / change it (every change is logged with a reason)
 */
export type SignatureAccess = 'none' | 'view' | 'use' | 'edit';

export const SIGNATURE_ACCESS_LEVELS: readonly SignatureAccess[] = ['none', 'view', 'use', 'edit'] as const;

const RANK: Record<SignatureAccess, number> = {
  none: 0,
  view: 1,
  use: 2,
  edit: 3,
};

export const SIGNATURE_ACCESS_LABELS: Record<SignatureAccess, string> = {
  none: 'No access',
  view: 'Can view',
  use: 'Can use',
  edit: 'Can edit',
};

export const SIGNATURE_ACCESS_DESCRIPTIONS: Record<SignatureAccess, string> = {
  none: 'No access to the company signature',
  view: 'See the company signature',
  use: 'Counter-sign contracts with it',
  edit: 'Set up and change it (logged with reason)',
};

export function isSignatureAccess(value: unknown): value is SignatureAccess {
  return typeof value === 'string' && (SIGNATURE_ACCESS_LEVELS as readonly string[]).includes(value);
}

/** Normalizes any unknown value to a valid SignatureAccess level (defaults to 'none'). */
export function normalizeSignatureAccess(value: unknown): SignatureAccess {
  return isSignatureAccess(value) ? value : 'none';
}

export function signatureAccessRank(level: unknown): number {
  return RANK[normalizeSignatureAccess(level)];
}

/** True when `actual` grants at least `required`. */
export function hasSignatureAccess(actual: unknown, required: Exclude<SignatureAccess, 'none'>): boolean {
  return signatureAccessRank(actual) >= RANK[required];
}
