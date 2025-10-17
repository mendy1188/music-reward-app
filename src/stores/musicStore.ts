import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MusicChallenge } from '../types';
import { SAMPLE_CHALLENGES } from '../constants/theme';

type DeductionInfo = { pointsDeducted: number; forwardSeeks: number, peakRate?: number | undefined};

interface MusicStore {
  // Ephemeral UI/catalog state (NOT persisted directly)
  challenges: MusicChallenge[];
  currentTrack: MusicChallenge | null;
  isPlaying: boolean;
  currentPosition: number;

  // Persisted user progress (IDs) + persisted per-challenge deductions
  completedChallenges: string[];
  // NEW: persisted deductions by challenge ID
  deductionsById: Record<string, DeductionInfo>;

  // Actions
  loadChallenges: () => void; // rebuild from SAMPLE_CHALLENGES + completed + deductions map
  setCurrentTrack: (track: MusicChallenge | null) => void;
  updateProgress: (challengeId: string, progress: number) => void;

  // Accept optional deduction info on complete
  markChallengeComplete: (
    challengeId: string,
    opts?: { pointsDeducted?: number; forwardSeeks?: number, peakRate?: number }
  ) => void;

  setIsPlaying: (playing: boolean) => void;
  setCurrentPosition: (position: number) => void;

  // Dev/helper
  resetProgress: () => Promise<void>;
}

// Build ephemeral list from catalog + completed IDs + persisted deductions
const buildChallenges = (
  completedIds: string[],
  deductionsById: Record<string, DeductionInfo>
): MusicChallenge[] =>
  SAMPLE_CHALLENGES.map((c) => {
    const completed = completedIds.includes(c.id);
    const d = deductionsById[c.id];
    return {
      ...c,
      completed,
      progress: completed ? 100 : 0,
      pointsDeducted: d?.pointsDeducted ?? 0,
      forwardSeeks: d?.forwardSeeks ?? 0,
      peakRate: d?.peakRate ?? 0,
    };
  });

export const useMusicStore = create<MusicStore>()(
  persist(
    (set, get) => ({
      // Ephemeral (catalog + ui)
      challenges: buildChallenges([], {}),
      currentTrack: null,
      isPlaying: false,
      currentPosition: 0,

      // Persisted slices
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
        // state: any => not sure why 'untype state' was yelling
        set((state: any) => {
          const already = state.completedChallenges.includes(challengeId);
          const nextCompleted = already
            ? state.completedChallenges
            : [...state.completedChallenges, challengeId];

          // persist/merge the deduction for this challenge
          const prevDeduction = state.deductionsById[challengeId] ?? { pointsDeducted: 0, forwardSeeks: 0, peakRate: undefined };
          const nextDeduction: DeductionInfo = {
            pointsDeducted: opts?.pointsDeducted ?? prevDeduction.pointsDeducted,
            forwardSeeks: opts?.forwardSeeks ?? prevDeduction.forwardSeeks,
            peakRate: opts?.peakRate ?? prevDeduction.peakRate,
          };

          // reflect completion + deduction into ephemeral array
          const nextChallenges = state.challenges.map((ch: any) =>
            ch.id === challengeId
              ? {
                  ...ch,
                  completed: true,
                  progress: 100,
                  completedAt: new Date().toISOString(),
                  pointsDeducted: nextDeduction.pointsDeducted,
                  forwardSeeks: nextDeduction.forwardSeeks,
                  peakRate: nextDeduction.peakRate,
                }
              : ch
          );

          return {
            completedChallenges: nextCompleted,
            deductionsById: {
              ...state.deductionsById,
              [challengeId]: nextDeduction,
            },
            challenges: nextChallenges,
          };
        });
      },

      setIsPlaying: (playing) =>
        set((state) =>
          state.isPlaying === playing ? state : { isPlaying: playing }
        ),

      setCurrentPosition: (position) => set({ currentPosition: position }),

      resetProgress: async () => {
        // Clear persisted progress + deductions; rebuild ephemeral list
        set({ completedChallenges: [], deductionsById: {} });
        set({ challenges: buildChallenges([], {}) });
      },
    }),
    {
      name: 'music-store',
      storage: createJSONStorage(() => AsyncStorage),

      // ✅ Persist ONLY progress IDs + the small deductions map
      partialize: (state) => ({
        completedChallenges: state.completedChallenges,
        deductionsById: state.deductionsById,
      }),

      // After rehydrate, rebuild ephemeral challenges from SAMPLE + persisted progress & deductions
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        setTimeout(() => {
          const completed = state.completedChallenges ?? [];
          const deductions = state.deductionsById ?? {};
          useMusicStore.setState({
            challenges: buildChallenges(completed, deductions),
          });
        }, 0);
      },
    }
  )
);

// Selectors
export const selectChallenges = (s: MusicStore) => s.challenges;
export const selectCurrentTrack = (s: MusicStore) => s.currentTrack;
export const selectIsPlaying = (s: MusicStore) => s.isPlaying;
