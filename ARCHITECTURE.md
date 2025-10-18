
---

# ARCHITECTURE.md

```md
# 🧭 Architecture & Design Decisions

This document explains how the app is structured, why we chose certain libraries, and how the points engine + playback pipeline work.

---

## High-Level Goals

- Keep **business logic in hooks** and **state in stores** (Zustand).
- Keep screens presentational and declarative.
- Make playback robust (background, interruptions, rate, seeking).
- Make points logic deterministic and testable.
- Be “offline-first” (stream from remote while caching in the background).

---

## Modules & Responsibilities

### 1) `stores/` (Zustand)
- **musicStore.ts**
  - Ephemeral UI: current track, progress, playing flag.
  - Persisted: `completedChallenges: string[]`, `deductionsById: Record<string, DeductionInfo>`.
  - `markChallengeComplete(challengeId, opts)` merges/updates per-challenge deductions:
    - `pointsDeducted`, `forwardSeeks`, `peakRate`
  - Versioned persistence with `version` + `migrate` to keep data stable.
- **userStore.ts**
  - `totalPoints` (sum of awarded points).
  - `completedChallenges` to block duplicate awards.
- **themeStore.ts**
  - `mode: 'light' | 'dark' | 'system'` + persisted.
  - Device color scheme is read via `useColorScheme()`, merged by `useTheme()`.

> **Selectors** (e.g., `selectChallenges`) minimize re-renders by subscribing only to the needed slices.

---

### 2) `hooks/`

#### `useMusicPlayer.ts`
- Single source of playback truth that orchestrates:
  - `react-native-track-player` (play, pause, resume, seek, rate)
  - **Completion detection** (percentage threshold)
  - **Penalty accounting**
    - **Forward seek detection**
      - Primary: when our own `seekTo(seconds)` jumps past a threshold
      - Fallback: detect “sudden position deltas” from `useProgress()` ticks
    - **Playback rate penalties**
      - Cache **highest** rate encountered during the session
      - Apply penalty once on completion
  - **Awarding** points:
    - If `ALLOW_REEARN_ON_REPLAY` is false, checks `userStore.completedChallenges`
    - Otherwise allows subsequent awards
  - **Interruption handling**
    - `Event.RemoteDuck` (system audio focus)
    - `Event.PlaybackInterrupted` (Android)
  - **Crossfade**
    - Lightweight volume fade-in/out via `audioService.setPlayerVolume`

#### `useTheme.ts`
- Combines `themeStore.mode` with device scheme and returns `THEME_LIGHT` or `THEME_DARK`.

---

### 3) `services/`

#### `audioService.ts`
- `ensurePlayerSetup()` configures TrackPlayer (category, capabilities).
- `setPlaybackRate(rate)` wrapper with runtime guards.
- `setPlayerVolume(vol)` helper for simple crossfades.

#### `cacheservice.ts`
- **Stream-while-caching**:
  - First play uses **remote URL immediately**
  - Kicks off a background download to `FileSystem.cacheDirectory`
  - Next play uses the cached file (if available)
- This avoids delaying first playback and still supports offline replays.

---

### 4) `constants/`

#### `theme.ts`
- **THEME_DARK** (your original tokens) and **THEME_LIGHT** variant.
- `SAMPLE_CHALLENGES` demo data.

#### `rules.ts`
- Centralized rules for the points engine:
  - `COMPLETION_THRESHOLD_PCT` (default 90)
  - `FORWARD_SEEK_THRESHOLD_SEC` (jump threshold)
  - `FORWARD_SEEK_PENALTY_PCT` (default 0.10 per skip)
  - `RATE_PENALTY_PCT` (e.g., `{ 1.25: 0.05, 2: 0.15 }`)
  - `ALLOW_REEARN_ON_REPLAY`
  - `REQUIRE_ACTIVE_TRACK_ID`

> Keeping this as a single object makes it easy to A/B test or tweak penalties globally.

---

### 5) `components/ui/`

- **Glass design system** (`GlassCard`, `GlassButton`) uses blur and consistent tokens.
- **AudioEqualizer** renders an animated bar visualizer.
  - Each instance has its **own Animated values**; it only animates when `playing && isCurrentTrack` (prop-driven), so two instances don’t animate in sync.
- **Confetti** shows a celebratory burst when a track transitions to “completed”.
- **Toast**: small animated container for micro-feedback (seek penalties, speed penalties, etc).

---

## Navigation

- **Expo Router** keeps routes organized:
  - Tabs: `(tabs)/…`
  - Modals: `(modals)/player`, `(modals)/challenge/[id]`
- The Player is a modal to prioritize depth without leaving the current tab stack.

---

## Points Engine (Deterministic)

1. **When do we award?**
   - On progress tick when `pct >= COMPLETION_THRESHOLD_PCT`
   - Debounced: ignore if position < `MIN_SECONDS_BEFORE_AWARD` but pct is already high
   - Only once per session (`awardedRef`) and once ever if re-earn is disabled.

2. **How do we calculate penalties?**
   - **Forward seeks:** count each forward jump > `FORWARD_SEEK_THRESHOLD_SEC`
     - penalty = `basePoints * (FORWARD_SEEK_PENALTY_PCT * count)` (capped to 100%)
   - **Playback rate:** track **highest rate** used; apply mapped penalty once
   - Total deducted = seek penalty + rate penalty (capped so you never go below 0)

3. **Persistence**
   - On completion, we call `musicStore.markChallengeComplete()` with:
     - `pointsDeducted`, `forwardSeeks`, `peakRate`
   - `userStore.completeChallenge(challengeId, effectivePoints)` increases total points.

---

## Offline-First Strategy

- On **first play**, use the remote URL immediately for fast start.
- In parallel, download to cache. On subsequent plays of the same track, load from cache.
- If offline, `getCachedPath()` returns a local file if available.

---

## Performance Considerations

- Zustand **selectors** keep components from over-rendering.
- `useMemo` for derived values (e.g., styles based on THEME).
- Animated values in `AudioEqualizer` are instance-scoped to avoid shared animation state.

---

## Error Handling

- **ErrorBoundary** around root navigator catches render errors.
- Toasts + Alerts for playback errors.
- Defensive `try/catch` around native calls (Haptics, TrackPlayer).

---

## Testing Strategy

- Unit tests focus on:
  - **musicStore**: completion, merging deductions, migrations
  - **userStore**: points accumulation rules
  - **useMusicPlayer (logic)**: award/penalty math via mocks (seek counts, peak rate)
- RTL tests can validate UI changes for Profile cards and Player toasts.

---

## Why These Choices?

- **Zustand**: tiny, explicit, serializable state with minimal boilerplate; great for cross-screen shared data without context churn.
- **TrackPlayer**: the de-facto audio engine for RN with background + lockscreen + system controls support.
- **Expo**: fastest DX; unified APIs (Haptics, FileSystem, Blur), painless dev builds.
- **Rules-first design**: keeping rules in a single object lets you change “product” without touching logic.

---

## Future Enhancements

- Real backend sync for challenges, points, and audit trail (current “banking” is local).
- Richer visualizer (FFT) via native audio samples.
- In-app AB testing for rules via remote config.
- Server-authoritative awarding to prevent client tampering.
