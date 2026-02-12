export const sanitizeOtp = (value: string): string =>
  value.replace(/\D/g, "").slice(0, 6);

export const isValidEmail = (value: string): boolean => /\S+@\S+\.\S+/.test(value);
