import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserStore {
  totalPoints: number;
  completedChallenges: string[];
  addPoints: (points: number) => void;
  completeChallenge: (challengeId: string, awardPoints?: number) => void;
  resetProgress: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      totalPoints: 0,
      completedChallenges: [],

      addPoints: (points) =>
        set((s) => ({ totalPoints: s.totalPoints + (Number(points) || 0) })),

      completeChallenge: (challengeId, awardPoints) =>
        set((s) => {
          if (s.completedChallenges.includes(challengeId)) return s;
          return {
            completedChallenges: [...s.completedChallenges, challengeId],
            totalPoints: typeof awardPoints === 'number' ? s.totalPoints + awardPoints : s.totalPoints,
          };
        }),

      resetProgress: () => set({ totalPoints: 0, completedChallenges: [] }),
    }),
    {
      name: 'user-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persisted: any, fromVersion) => {
        //persisted: any => This needs to be worked on for better type
        const base = { totalPoints: 0, completedChallenges: [] as string[] };
        if (!persisted || typeof persisted !== 'object') return base;

        const p = { ...persisted };
        p.totalPoints = Math.max(0, Number(p.totalPoints) || 0);
        p.completedChallenges = Array.isArray(p.completedChallenges)
          ? p.completedChallenges.filter((x: any) => typeof x === 'string' && x)
          : [];

        // future migrations here, e.g. if (fromVersion < 3) { ... }
        return { ...base, ...p };
      },
    }
  )
);

export const selectTotalPoints = (s: UserStore) => s.totalPoints;
export const selectCompletedChallenges = (s: UserStore) => s.completedChallenges;
