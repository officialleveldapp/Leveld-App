export function legalUrl(kind: 'terms' | 'privacy'): string {
  const env =
    kind === 'terms'
      ? process.env.EXPO_PUBLIC_LEGAL_TERMS_URL
      : process.env.EXPO_PUBLIC_LEGAL_PRIVACY_URL;
  const trimmed = env?.trim();
  if (trimmed) return trimmed;
  return kind === 'terms'
    ? 'https://leveldai.com/terms'
    : 'https://leveldai.com/privacy-policy';
}
