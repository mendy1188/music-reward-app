// Zustand store for user data and points
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserStore {
  // State
  totalPoints: number;
  completedChallenges: string[];
  
  // Actions
  addPoints: (points: number) => void;
  completeChallenge: (challengeId: string, awardPoints?: number) => void;
  resetProgress: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      // Initial state
      totalPoints: 0,
      completedChallenges: [],

      // Actions
      addPoints: (points: number) => {
        set((state) => ({
          totalPoints: state.totalPoints + points,
        }));
      },

      completeChallenge: (challengeId, awardPoints) =>
        set((state) => {
          if (state.completedChallenges.includes(challengeId)) return state;
          return {
            completedChallenges: [...state.completedChallenges, challengeId],
            totalPoints: awardPoints ? state.totalPoints + awardPoints : state.totalPoints,
          };
        }),

      resetProgress: () => {
        set({
          totalPoints: 0,
          completedChallenges: [],
        });
      },
    }),
    {
      name: 'user-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2, // bump when shape changes
      migrate: (persisted, fromVersion) => {
        // Safely handle older shapes
        if (!persisted) return { totalPoints: 0, completedChallenges: [] };
        if (fromVersion < 2) {
          // add future fields with defaults if you add them later
        }
        return persisted;
      },
    }
  )
);

// Selector functions
export const selectTotalPoints = (state: UserStore) => state.totalPoints;
export const selectCompletedChallenges = (state: UserStore) => state.completedChallenges;