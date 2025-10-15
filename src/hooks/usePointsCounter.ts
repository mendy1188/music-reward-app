import { useCallback, useEffect, useRef, useState } from 'react';
import { useProgress } from 'react-native-track-player';

export interface PointsCounterConfig {
  totalPoints: number;
  durationSeconds: number;
  challengeId: string;
}

export interface UsePointsCounterReturn {
  currentPoints: number;
  pointsEarned: number;
  progress: number; // 0-100
  isActive: boolean;
  startCounting: (config: PointsCounterConfig) => void;
  stopCounting: () => void;
  resetProgress: () => void;
}

export const usePointsCounter = (): UsePointsCounterReturn => {
  const [currentPoints, setCurrentPoints] = useState(0);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [config, setConfig] = useState<PointsCounterConfig | null>(null);
  const progressState = useProgress();
  const lastPointsRef = useRef(0);

  const startCounting = useCallback((newConfig: PointsCounterConfig) => {
    setConfig(newConfig);
    setIsActive(true);
    setCurrentPoints(0);
    setPointsEarned(0);
    lastPointsRef.current = 0;
  }, []);

  const stopCounting = useCallback(() => {
    setIsActive(false);
  }, []);

  const resetProgress = useCallback(() => {
    setCurrentPoints(0);
    setPointsEarned(0);
    lastPointsRef.current = 0;
  }, []);

  useEffect(() => {
    if (!isActive || !config) return;
    const duration = progressState.duration || config.durationSeconds || 1;
    const progressPct = Math.min(100, Math.max(0, (progressState.position / duration) * 100));
    const earned = Math.floor((progressPct / 100) * config.totalPoints);
    if (earned > lastPointsRef.current) {
      lastPointsRef.current = earned;
      setPointsEarned(earned);
      setCurrentPoints(earned);
    }
  }, [progressState.position, progressState.duration, isActive, config]);

  return {
    currentPoints,
    pointsEarned,
    progress: config ? Math.min(100, Math.max(0, (progressState.position / (progressState.duration || config.durationSeconds || 1)) * 100)) : 0,
    isActive,
    startCounting,
    stopCounting,
    resetProgress,
  };
};

export default usePointsCounter;
