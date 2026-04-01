/**
 * Google OAuth for iOS/Android native clients must use a redirect whose *scheme* is the
 * reversed client ID (see GoogleService-Info REVERSED_CLIENT_ID), not the app bundle id.
 * Otherwise Google returns 400 invalid_request on the consent page.
 *
 * @see https://developers.google.com/identity/protocols/oauth2/native-app
 */
export function googleNativeRedirectUri(googleClientId: string | undefined): string | null {
  const id = googleClientId?.trim();
  if (!id) return null;
  const match = id.match(/^([^.]+)\.apps\.googleusercontent\.com$/);
  if (!match) return null;
  return `com.googleusercontent.apps.${match[1]}:/oauth2redirect/google`;
}
