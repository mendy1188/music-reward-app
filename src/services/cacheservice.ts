import * as FileSystem from 'expo-file-system/legacy';

const CACHE_DIR = `${FileSystem.documentDirectory}audio-cache/`;

async function ensureDir() {
  try { await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true }); } catch {}
}

export async function getCachedIfExists(remoteUrl: string): Promise<string | null> {
  await ensureDir();
  const name = encodeURIComponent(remoteUrl) + '.mp3';
  const local = CACHE_DIR + name;
  const info = await FileSystem.getInfoAsync(local);
  return (info && (info as any).exists) ? local : null;
}

/**
 * Fire-and-forget cache. Returns immediately; caller can keep using remote URL.
 */
export async function cacheInBackground(remoteUrl: string): Promise<void> {
  try {
    await ensureDir();
    const name = encodeURIComponent(remoteUrl) + '.mp3';
    const local = CACHE_DIR + name;
    const info = await FileSystem.getInfoAsync(local);
    if (info && (info as any).exists) return; // already cached
    await FileSystem.downloadAsync(remoteUrl, local);
  } catch {
    // silent: caching is best-effort
  }
}
