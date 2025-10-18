import { act } from '@testing-library/react-native';
import { useUserStore } from '../../src/stores/userStore';

describe('userStore', () => {
  beforeEach(() => {
    act(() => {
      useUserStore.setState({ totalPoints: 0, completedChallenges: [] });
    });
  });

  it('addPoints increments total', () => {
    act(() => useUserStore.getState().addPoints(100));
    expect(useUserStore.getState().totalPoints).toBe(100);
  });

  it('completeChallenge adds once and applies points', () => {
    act(() => useUserStore.getState().completeChallenge('t1', 300));
    expect(useUserStore.getState().totalPoints).toBe(300);
    expect(useUserStore.getState().completedChallenges).toContain('t1');

    // completing again should be ignored
    act(() => useUserStore.getState().completeChallenge('t1', 300));
    expect(useUserStore.getState().totalPoints).toBe(300);
  });
});
