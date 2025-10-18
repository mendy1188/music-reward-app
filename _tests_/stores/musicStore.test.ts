import { act } from '@testing-library/react-native';
import { useMusicStore } from '../../src/stores/musicStore';

jest.mock('../../src/constants/theme', () => ({
  // keep ids predictable for testing
  SAMPLE_CHALLENGES: [
    { id: 't1', title: 'Track 1', artist: 'A', duration: 120, points: 300 },
    { id: 't2', title: 'Track 2', artist: 'B', duration: 90, points: 150 },
  ],
  THEME: { colors: { accent: '#0f0' }, fonts: { sizes: { md: 14 } }, spacing: { md: 8 } },
}));

describe('musicStore', () => {
  beforeEach(() => {
    // reset to a known state
    act(() => {
      useMusicStore.setState({
        challenges: [],
        currentTrack: null,
        isPlaying: false,
        currentPosition: 0,
        completedChallenges: [],
        deductionsById: {},
      });
    });
    act(() => useMusicStore.getState().loadChallenges());
  });

  it('builds challenges from sample + completed + deductions', () => {
    const s = useMusicStore.getState();
    expect(s.challenges).toHaveLength(2);
    expect(s.challenges[0].completed).toBe(false);
  });

  it('markChallengeComplete updates completed arrays and persists deductions', () => {
    act(() => {
      useMusicStore.getState().markChallengeComplete('t2', {
        pointsDeducted: 30,
        forwardSeeks: 2,
        peakRate: 2.0,
      });
    });

    const s = useMusicStore.getState();
    expect(s.completedChallenges).toContain('t2');
    expect(s.deductionsById['t2']).toEqual({
      pointsDeducted: 30,
      forwardSeeks: 2,
      peakRate: 2.0,
    });

    const t2 = s.challenges.find((c) => c.id === 't2')!;
    expect(t2.completed).toBe(true);
    expect(t2.pointsDeducted).toBe(30);
    expect(t2.forwardSeeks).toBe(2);
    expect(t2.peakRate).toBe(2.0);
  });

  it('updateProgress clamps progress between 0 and 100', () => {
    act(() => useMusicStore.getState().updateProgress('t1', 150));
    const t1 = useMusicStore.getState().challenges.find((c) => c.id === 't1')!;
    expect(t1.progress).toBe(100);
    act(() => useMusicStore.getState().updateProgress('t1', -10));
    expect(useMusicStore.getState().challenges.find((c) => c.id === 't1')!.progress).toBe(0);
  });
});
