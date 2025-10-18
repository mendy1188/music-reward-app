import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MusicChallenge } from '../types';
import { SAMPLE_CHALLENGES } from '../constants/theme';

type DeductionInfo = { pointsDeducted: number; forwardSeeks: number; peakRate?: number };

interface MusicStore {
  // Ephemeral UI/catalog (not persisted)
  challenges: MusicChallenge[];
  currentTrack: MusicChallenge | null;
  isPlaying: boolean;
  currentPosition: number;

  // Persisted slices
  completedChallenges: string[];
  deductionsById: Record<string, DeductionInfo>;

  // Actions
  loadChallenges: () => void;
  setCurrentTrack: (track: MusicChallenge | null) => void;
  updateProgress: (challengeId: string, progress: number) => void;
  markChallengeComplete: (
    challengeId: string,
    opts?: { pointsDeducted?: number; forwardSeeks?: number; peakRate?: number }
  ) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentPosition: (position: number) => void;
  resetProgress: () => Promise<void>;
}

const buildChallenges = (
  completedIds: string[],
  deductionsById: Record<string, DeductionInfo>
): MusicChallenge[] =>
  SAMPLE_CHALLENGES?.map((c) => {
    const d = deductionsById[c.id];
    const completed = completedIds.includes(c.id);
    return {
      ...c,
      completed,
      progress: completed ? 100 : 0,
      pointsDeducted: d?.pointsDeducted ?? 0,
      forwardSeeks: d?.forwardSeeks ?? 0,
      peakRate: d?.peakRate,
    };
  }) as any; // as any: because it keeps yelling

export const useMusicStore = create<MusicStore>()(
  persist(
    (set, get) => ({
      // Ephemeral
      challenges: buildChallenges([], {}),
      currentTrack: null,
      isPlaying: false,
      currentPosition: 0,

      // Persisted
      completedChallenges: [],
      deductionsById: {},

      loadChallenges: () => {
        const { completedChallenges, deductionsById } = get();
        set({ challenges: buildChallenges(completedChallenges, deductionsById) });
      },

      setCurrentTrack: (track) => set({ currentTrack: track }),

      updateProgress: (challengeId, progress) => {
        set((state) => ({
          challenges: state.challenges.map((ch) =>
            ch.id === challengeId
              ? { ...ch, progress: Math.max(0, Math.min(progress, 100)) }
              : ch
          ),
        }));
      },

      markChallengeComplete: (challengeId, opts) => {
        //any: this has to be looked at for right type
        set((state: any) => {
          const already = state.completedChallenges.includes(challengeId);
          const nextCompleted = already
            ? state.completedChallenges
            : [...state.completedChallenges, challengeId];

          const prev = state.deductionsById[challengeId] ?? {
            pointsDeducted: 0,
            forwardSeeks: 0,
            peakRate: undefined as number | undefined,
          };
          const next: DeductionInfo = {
            pointsDeducted: opts?.pointsDeducted ?? prev.pointsDeducted,
            forwardSeeks: opts?.forwardSeeks ?? prev.forwardSeeks,
            peakRate:
              typeof opts?.peakRate === 'number'
                ? opts?.peakRate
                : typeof prev.peakRate === 'number'
                ? prev.peakRate
                : undefined,
          };

          const nextChallenges = state.challenges.map((ch: any) =>
            ch.id === challengeId
              ? {
                  ...ch,
                  completed: true,
                  progress: 100,
                  completedAt: new Date().toISOString(),
                  pointsDeducted: next.pointsDeducted,
                  forwardSeeks: next.forwardSeeks,
                  peakRate: next.peakRate,
                }
              : ch
          );

          return {
            completedChallenges: nextCompleted,
            deductionsById: { ...state.deductionsById, [challengeId]: next },
            challenges: nextChallenges,
          };
        });
      },

      setIsPlaying: (playing) =>
        set((state) => (state.isPlaying === playing ? state : { isPlaying: playing })),

      setCurrentPosition: (position) => set({ currentPosition: position }),

      resetProgress: async () => {
        set({ completedChallenges: [], deductionsById: {} });
        set({ challenges: buildChallenges([], {}) });
      },
    }),
    {
      name: 'music-store',
      storage: createJSONStorage(() => AsyncStorage),

      // bump this when persisted shape changes
      version: 3,

      // Persist ONLY these keys
      partialize: (state) => ({
        completedChallenges: state.completedChallenges,
        deductionsById: state.deductionsById,
      }),

      // Migrate only the persisted slice; sanitize shapes
      migrate: (persisted: any, fromVersion) => {
        const base = { completedChallenges: [] as string[], deductionsById: {} as Record<string, DeductionInfo> };

        if (!persisted || typeof persisted !== 'object') return base;

        const p = { ...persisted };

        // ensure arrays/objects
        p.completedChallenges = Array.isArray(p.completedChallenges)
          ? p.completedChallenges.filter((x: any) => typeof x === 'string' && x)
          : [];

        if (!p.deductionsById || typeof p.deductionsById !== 'object') {
          p.deductionsById = {};
        }

        // backfill for pre-v3
        if (fromVersion < 3) {
          p.deductionsById = p.deductionsById || {};
        }

        // sanitize each deduction entry
        for (const id of Object.keys(p.deductionsById)) {
          const d = p.deductionsById[id] ?? {};
          p.deductionsById[id] = {
            pointsDeducted: Math.max(0, Number(d.pointsDeducted) || 0),
            forwardSeeks: Math.max(0, Number(d.forwardSeeks) || 0),
            peakRate: typeof d.peakRate === 'number' ? d.peakRate : undefined,
          };
        }

        return { ...base, ...p };
      },

      // After rehydrate, rebuild ephemerals from the persisted slice
      onRehydrateStorage: () => (state, error) => {
        if (error) return;
        // next tick to avoid set during rehydrate warning
        setTimeout(() => {
          try {
            useMusicStore.getState().loadChallenges();
          } catch {}
        }, 0);
      },
    }
  )
);

export const selectChallenges = (s: MusicStore) => s.challenges;
export const selectCurrentTrack = (s: MusicStore) => s.currentTrack;
export const selectIsPlaying = (s: MusicStore) => s.isPlaying;
