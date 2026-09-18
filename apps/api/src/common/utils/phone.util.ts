export function normalizePhoneE164(
  raw: string,
  defaultCountryCode = '971',
): string {
  const digitsOnly = raw.replace(/\D/g, '');

  if (digitsOnly.startsWith('00')) {
    return '+' + digitsOnly.slice(2);
  }
  if (digitsOnly.startsWith(defaultCountryCode)) {
    return '+' + digitsOnly;
  }
  if (digitsOnly.startsWith('0')) {
    return '+' + defaultCountryCode + digitsOnly.slice(1);
  }
  return '+' + defaultCountryCode + digitsOnly;
}
