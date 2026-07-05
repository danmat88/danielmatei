/**
 * Living Sky backend config.
 *
 * With this set to null the sky runs on a local fallback (each browser only
 * counts itself — honest, but not shared). To make every visitor's star
 * permanent and shared worldwide:
 *   1. console.firebase.google.com → create project → add a Web app
 *   2. enable Firestore, rules: allow read/write on /sky/counter only
 *   3. paste the web config object below
 *
 * export const firebaseConfig = {
 *   apiKey: '...', authDomain: '...', projectId: '...', appId: '...',
 * }
 */
export const firebaseConfig: Record<string, string> | null = null
