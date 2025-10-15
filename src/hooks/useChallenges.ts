import { useCallback, useState } from 'react';
import { useMusicStore } from '../stores/musicStore';
import { useUserStore } from '../stores/userStore';
import type { MusicChallenge } from '../types';

export interface UseChallengesReturn {
  challenges: MusicChallenge[];
  completedChallenges: string[];
  loading: boolean;
  error: string | null;
  refreshChallenges: () => Promise<void>;
  completeChallenge: (challengeId: string) => Promise<void>;
}

export const useChallenges = (): UseChallengesReturn => {
  const challenges = useMusicStore(s => s.challenges);
  const loadChallenges = useMusicStore(s => s.loadChallenges);
  const markChallengeComplete = useMusicStore(s => s.markChallengeComplete);
  const completed = useUserStore(s => s.completedChallenges);
  const addPoints = useUserStore(s => s.addPoints);
  const completeUser = useUserStore(s => s.completeChallenge);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshChallenges = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await loadChallenges();
    } catch (e: any) {
      setError(e?.message || 'Failed to load challenges');
    } finally {
      setLoading(false);
    }
  }, [loadChallenges]);

  const completeChallenge = useCallback(async (challengeId: string) => {
    const challenge = challenges.find(c => c.id === challengeId);
    if (!challenge) return;
    markChallengeComplete(challengeId);
    addPoints(challenge.points);
    completeUser(challengeId);
  }, [challenges, markChallengeComplete, addPoints, completeUser]);

  return {
    challenges,
    completedChallenges: completed,
    loading,
    error,
    refreshChallenges,
    completeChallenge
  };
};

export default useChallenges;
