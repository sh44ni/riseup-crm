/**
 * Rise Up CRM — Contact Validation & Protocol Utilities
 * Provides standard validation for email, phone, and address,
 * plus clean URL generation for tel:, mailto:, and sms: protocols.
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface ContactValidationErrors {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  zip?: string;
}

/**
 * Validates email format according to standard RFC-compliant pattern.
 * Allows empty if not required, but if provided, must be a valid email.
 */
export function validateEmail(email: string, required: boolean = true): ValidationResult {
  const trimmed = (email || '').trim();
  if (!trimmed) {
    if (required) {
      return { isValid: false, error: 'Email address is required.' };
    }
    return { isValid: true };
  }

  // Standard email regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email address (e.g. name@domain.com).' };
  }

  return { isValid: true };
}

/**
 * Validates US phone number format (at least 10 digits).
 */
export function validatePhone(phone: string, required: boolean = true): ValidationResult & { cleanDigits: string; formatted: string } {
  const trimmed = (phone || '').trim();
  const digits = trimmed.replace(/\D/g, '');

  if (!digits) {
    if (required) {
      return { isValid: false, error: 'Phone number is required.', cleanDigits: '', formatted: '' };
    }
    return { isValid: true, cleanDigits: '', formatted: '' };
  }

  // Strip leading 1 if 11 digits (US country code)
  const normalizedDigits = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;

  if (normalizedDigits.length < 10) {
    return {
      isValid: false,
      error: `Phone number requires 10 digits (currently ${normalizedDigits.length}).`,
      cleanDigits: normalizedDigits,
      formatted: formatPhoneNumber(normalizedDigits),
    };
  }

  return {
    isValid: true,
    cleanDigits: normalizedDigits,
    formatted: formatPhoneNumber(normalizedDigits),
  };
}

/**
 * Formats a 10-digit phone number as (XXX) XXX-XXXX.
 */
export function formatPhoneNumber(value: string): string {
  const digits = (value || '').replace(/\D/g, '');
  const clean = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;

  if (clean.length === 0) return '';
  if (clean.length <= 3) return `(${clean}`;
  if (clean.length <= 6) return `(${clean.slice(0, 3)}) ${clean.slice(3)}`;
  return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6, 10)}`;
}

/**
 * Validates street address, city, and ZIP code.
 */
export function validateAddress(
  address: string,
  city?: string,
  zip?: string,
  required: boolean = false
): { isValid: boolean; errors: ContactValidationErrors } {
  const errors: ContactValidationErrors = {};
  const addrTrimmed = (address || '').trim();
  const cityTrimmed = (city || '').trim();
  const zipTrimmed = (zip || '').trim();

  if (required && !addrTrimmed) {
    errors.address = 'Street address is required.';
  } else if (addrTrimmed && addrTrimmed.length < 4) {
    errors.address = 'Please enter a complete street address.';
  }

  if (required && !cityTrimmed) {
    errors.city = 'City is required.';
  }

  if (zipTrimmed) {
    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (!zipRegex.test(zipTrimmed)) {
      errors.zip = 'ZIP code must be 5 digits (e.g. 92054) or 9 digits (e.g. 92054-1234).';
    }
  } else if (required) {
    errors.zip = 'ZIP code is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Formats tel: URI for clickable calling actions.
 * Strips non-digits so native dialers open cleanly.
 */
export function getTelUrl(phone?: string | null): string {
  if (!phone) return '#';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '#';
  // If 10 digits US, prefix with +1 for international dialers
  if (digits.length === 10) return `tel:+1${digits}`;
  return `tel:+${digits}`;
}

/**
 * Formats mailto: URI for clickable email actions.
 */
export function getMailtoUrl(email?: string | null, subject?: string): string {
  if (!email || !email.trim()) return '#';
  const cleanEmail = email.trim();
  if (subject) {
    return `mailto:${cleanEmail}?subject=${encodeURIComponent(subject)}`;
  }
  return `mailto:${cleanEmail}`;
}

/**
 * Formats sms: URI for text messaging actions.
 */
export function getSmsUrl(phone?: string | null): string {
  if (!phone) return '#';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '#';
  return `sms:${digits}`;
}
