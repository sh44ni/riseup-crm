export const DEV_EMAILS: readonly string[] = [
  'imzeeshankhann@gmail.com',
  'spitz760@gmail.com',
];

/**
 * Returns true if the provided email matches one of the designated developer accounts.
 */
export function isDevEmail(email?: string | null): boolean {
  if (!email) return false;
  return DEV_EMAILS.includes(email.trim().toLowerCase());
}
