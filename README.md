# 🎧 Music Reward App

Earn points by listening to music — with smart rules for skipping and playback speed. Built with **Expo (SDK 54)**, **Expo Router**, **Zustand**, and **react-native-track-player**.

---

## ✨ Features

- **Home**: list of challenges with play controls
- **Player Modal**: full-screen player, progress, seek, speed (0.5× / 1.0× / 1.25× / 2.0×), visualizer, confetti
- **Profile**: total points, per-challenge progress, **deductions for skips & speed**, **Dark Mode toggle**
- **Challenge Detail (Modal)**: single challenge with live progress and penalties summary
- Points engine:
  - Completion threshold (default **90%**)
  - −**10%** per forward seek (configurable)
  - −**5%** @ **1.25×**, −**15%** @ **2.0×** (applied once using **highest** rate)
  - Optional re-earn on replay (default off)
- Background playback & audio focus (interruption) handling
- Stream-while-caching for offline replays
- Versioned persistence & migrations (Zustand)
- Haptics + custom toasts

---

## 🧱 Tech

- **React Native / Expo 54**
- **Expo Router** (file-based navigation with modals)
- **Zustand** + AsyncStorage (persisted slices) with migrations
- **react-native-track-player**
- **expo-blur**, **expo-file-system**, **expo-haptics**
- TypeScript

---

## 📦 Install

```bash
# 1) deps
npm install

# 2) iOS pods (if you build locally)
npx pod-install

▶️ Run
npm run start     # start dev server
# then in Expo CLI:
#   i = iOS, a = Android, w = Web


Common shortcuts:

npm run ios       # run iOS simulator
npm run android   # run Android emulator
npm run clean     # clear Metro & caches
npm run typecheck # TypeScript check
npm test          # run Jest tests (if configured)

🔧 Config you may tweak

src/constants/rules.ts

COMPLETION_THRESHOLD_PCT (default 90)

FORWARD_SEEK_THRESHOLD_SEC (jump size to count as a skip; default 5s)

FORWARD_SEEK_PENALTY_PCT (default 0.10 / 10% per forward seek)

RATE_PENALTY_PCT (e.g. { 1.25: 0.05, 2: 0.15 })

ALLOW_REEARN_ON_REPLAY (default false)

src/constants/theme.ts

Light & Dark tokens; useTheme() returns the active theme based on themeStore + system scheme.

Profile screen includes a Dark Mode card with a toggle (Light / Dark / System).

🗂️ Project layout (high level)
src/
  app/
    (tabs)/…
    (modals)/player.tsx
    (modals)/challenge/[id].tsx
  components/ui/ (GlassCard, GlassButton, Confetti, AudioEqualizer, etc.)
  constants/ (theme.ts, rules.ts)
  hooks/ (useMusicPlayer.ts, useTheme.ts)
  services/ (audioService.ts, cacheservice.ts)
  stores/ (musicStore.ts, userStore.ts, themeStore.ts)
  types/
__tests__/ (optional Jest tests)

🎚️ Audio & Background

ensurePlayerSetup() configures react-native-track-player with proper capabilities.

Interruption events handled:

Event.RemoteDuck (system focus)

Event.PlaybackInterrupted (Android)

If you see Haptics.selectionAsync is not available, ensure expo-haptics is installed and you’re on a device/simulator that supports it.

💾 Offline (stream-while-caching)

First play: streams remote URL immediately (no blocking)

In parallel: downloads to cache directory

Next play: uses cached file when available

If offline and cached exists → still plays

🧪 Tests

Jest scripts are set up in package.json. Place tests under __tests__/:

__tests__/
  stores/
  hooks/
  components/


Run:

npm test


If Metro/Jest behaves oddly, clear caches:

npm run clean && npm test

🆘 Troubleshooting

InternalBytecode.js ENOENT (Metro symbolication)
rm -rf $TMPDIR/metro-* node_modules/.cache && npm start -c

expo-file-system deprecation warnings
We use the current API (fileInfo, downloadAsync). Ensure Expo SDK 54.

Audio not awarding points
Check ALLOW_REEARN_ON_REPLAY, completion threshold, and penalties. Points award once per track unless re-earn is enabled.
