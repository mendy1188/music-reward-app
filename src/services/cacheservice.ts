// src/services/cacheservice.ts
// Stream-first caching: first play uses remote URL, cache happens in background.
// Subsequent plays use the cached file:// URI.
import * as FS from 'expo-file-system/legacy';

const CACHE_DIR = `${FS.cacheDirectory}audio-cache/`;
const inflight: Record<string, Promise<string>> = {};

async function ensureDir() {
  try {
    await FS.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  } catch {/* already exists */}
}

function localPathFor(remoteUrl: string) {
  return `${CACHE_DIR}${encodeURIComponent(remoteUrl)}.mp3`;
}

/** Quick check: if cached exists, return file:// path, else null */
export async function peekCached(remoteUrl: string): Promise<string | null> {
  await ensureDir();
  const path = localPathFor(remoteUrl);
  const info = await FS.getInfoAsync(path);
  return info.exists ? path : null;
}

/** Start caching in background (de-duped). Returns file path when finished. */
export function warmCache(remoteUrl: string): Promise<string> {
  const key = localPathFor(remoteUrl);
  if (!inflight[key]) {
    inflight[key] = (async () => {
      await ensureDir();
      // If it finished while we were setting up, bail early
      const existing = await FS.getInfoAsync(key);
      if (existing.exists) return key;

      const { uri } = await FS.downloadAsync(remoteUrl, key);
      return uri || key;
    })().finally(() => {
      // allow future refresh if needed
      delete inflight[key];
    });
  }
  return inflight[key];
}

/**
 * Get a URI you can feed to TrackPlayer:
 * - If cached exists → return file:// path.
 * - If not → return remoteUrl immediately and start background caching.
 */
export async function getPlayableUri(remoteUrl: string): Promise<string> {
  const cached = await peekCached(remoteUrl);
  if (cached) return cached;

  // kick off background cache, but don't await it
  warmCache(remoteUrl).catch(() => {});
  return remoteUrl; // stream immediately
}
