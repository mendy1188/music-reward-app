// src/stores/musicStore.ts
// Persist ONLY user progress (completedChallenges). Do NOT persist the catalog.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MusicChallenge } from '../types';
import { SAMPLE_CHALLENGES } from '../constants/theme';

interface MusicStore {
  // Ephemeral UI/catalog state (NOT persisted)
  challenges: MusicChallenge[];
  currentTrack: MusicChallenge | null;
  isPlaying: boolean;
  currentPosition: number;

  // Persisted user progress (IDs only)
  completedChallenges: string[];

  // Actions
  loadChallenges: () => void; // rebuild from SAMPLE_CHALLENGES + completed IDs
  setCurrentTrack: (track: MusicChallenge | null) => void;
  updateProgress: (challengeId: string, progress: number) => void;
  markChallengeComplete: (challengeId: string) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentPosition: (position: number) => void;

  // Dev helper
  resetProgress: () => Promise<void>;
}

const buildChallenges = (completedIds: string[]): MusicChallenge[] =>
  SAMPLE_CHALLENGES.map((c) => ({
    ...c,
    completed: completedIds.includes(c.id),
    progress: completedIds.includes(c.id) ? 100 : 0,
  }));

export const useMusicStore = create<MusicStore>()(
  persist(
    (set, get) => ({
      // Ephemeral (catalog + ui)
      challenges: buildChallenges([]),
      currentTrack: null,
      isPlaying: false,
      currentPosition: 0,

      // Persisted user progress
      completedChallenges: [],

      // Actions
      loadChallenges: () => {
        const { completedChallenges } = get();
        set({ challenges: buildChallenges(completedChallenges) });
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

      markChallengeComplete: (challengeId) => {
        set((state) => {
          const already = state.completedChallenges.includes(challengeId);
          const nextCompleted = already
            ? state.completedChallenges
            : [...state.completedChallenges, challengeId];

          // reflect completion in ephemeral challenges
          const nextChallenges = state.challenges.map((ch) =>
            ch.id === challengeId
              ? {
                  ...ch,
                  completed: true,
                  progress: 100,
                  completedAt: new Date().toISOString(),
                }
              : ch
          );

          return {
            completedChallenges: nextCompleted,
            challenges: nextChallenges,
          };
        });
      },

      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setCurrentPosition: (position) => set({ currentPosition: position }),

      resetProgress: async () => {
        // clear only the persisted progress; rebuild challenges fresh
        set({ completedChallenges: [] });
        set({ challenges: buildChallenges([]) });
      },
    }),
    {
      name: 'music-store',
      storage: createJSONStorage(() => AsyncStorage),

      // ✅ Persist ONLY user progress
      partialize: (state) => ({
        completedChallenges: state.completedChallenges,
      }),

      // After rehydrate, rebuild ephemeral challenges from SAMPLE + persisted progress
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        setTimeout(() => {
          const completed = state.completedChallenges ?? [];
          useMusicStore.setState({
            challenges: buildChallenges(completed),
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
