/**
 * Living Sky backend config (project: danielmatei-464d8).
 * Web config is public by design — security lives in firestore.rules,
 * which only allow reading the counter and incrementing it by exactly 1.
 */
export const firebaseConfig: Record<string, string> | null = {
  apiKey: 'AIzaSyC_nRBtRUQtfu_cZXEGv4QWpz4YtXR96Qk',
  authDomain: 'danielmatei-464d8.firebaseapp.com',
  projectId: 'danielmatei-464d8',
  storageBucket: 'danielmatei-464d8.firebasestorage.app',
  messagingSenderId: '711640046783',
  appId: '1:711640046783:web:a5b2242112b4162930ba0a',
}
