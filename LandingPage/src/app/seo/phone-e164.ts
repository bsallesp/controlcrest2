/** US numbers only; returns undefined if not 10/11 digits. */
export function phoneToE164Us(phone: string): string | undefined {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  return undefined;
}
