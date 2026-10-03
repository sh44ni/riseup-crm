export function formatPhoneNumber(value: string): string {
  if (!value) return value;
  const phoneNumber = value.replace(/[^\d]/g, '');
  const phoneNumberLength = phoneNumber.length;
  if (phoneNumberLength < 4) return phoneNumber;
  if (phoneNumberLength < 7) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
  }
  return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
}

export interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  textColor: string;
}

export function getPasswordStrength(pass: string): PasswordStrength {
  if (!pass) return { score: 0, label: 'None', color: 'bg-slate-200', textColor: 'text-slate-500' };
  let score = 0;
  if (pass.length >= 6) score += 1;
  if (pass.length >= 8) score += 1;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
  if (/\d/.test(pass)) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(pass)) score += 1;

  if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500', textColor: 'text-rose-600' };
  if (score <= 3) return { score: 2, label: 'Medium', color: 'bg-amber-500', textColor: 'text-amber-600' };
  if (score <= 4) return { score: 3, label: 'Good', color: 'bg-sky-500', textColor: 'text-sky-600' };
  return { score: 4, label: 'Strong', color: 'bg-emerald-500', textColor: 'text-emerald-600' };
}
