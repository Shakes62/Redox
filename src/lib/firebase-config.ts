/**
 * Public Firebase web config for project `redox-643e4`.
 *
 * A Firebase *web* API key is an identifier, not a secret: Google ships it to
 * every browser that loads a Firebase app. Access is controlled by Firebase Auth
 * itself (the admin's password) and by ADMIN_EMAIL, which this does not touch.
 * Env vars override these values, so a different project can be swapped in
 * without a code change.
 */
const DEFAULT_FIREBASE_WEB_API_KEY = 'AIzaSyD4rIJfGT9SLfYQ1nbTMDmVIqoSsXHKSpg';

export function getFirebaseWebApiKey(): string {
  return (process.env.FIREBASE_API_KEY || '').trim() || DEFAULT_FIREBASE_WEB_API_KEY;
}
