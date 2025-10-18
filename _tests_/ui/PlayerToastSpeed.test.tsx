import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import PlayerModal from '../../src/app/(modals)/player';

jest.useFakeTimers();

jest.mock('../../src/hooks/useMusicPlayer', () => ({
  useMusicPlayer: () => ({
    currentTrack: { id: 't1', title: 'T', artist: 'A', description: '', points: 100, progress: 0, completed: false },
    isPlaying: false,
    currentPosition: 0,
    duration: 120,
    play: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    seekTo: jest.fn(),
    setRate: jest.fn(),
    loading: false,
    error: null,
  }),
}));

jest.mock('../../src/constants/rules', () => ({
  PLAYBACK_RULES: {
    FORWARD_SEEK_THRESHOLD_SEC: 5,
    FORWARD_SEEK_PENALTY_PCT: 0.1,
    RATE_PENALTY_PCT: { 1.25: 0.05, 2: 0.15 },
    COMPLETION_THRESHOLD_PCT: 90,
    MIN_SECONDS_BEFORE_AWARD: 1,
    ALLOW_REEARN_ON_REPLAY: false,
    AWARD_ON_FAST_RATE: true,
    DEDUCT_ON_FORWARD_SEEK: true,
    REQUIRE_ACTIVE_TRACK_ID: false,
  },
}));

describe('PlayerModal speed penalty toast', () => {
  it('shows toast when selecting 1.25x/2.0x', () => {
    const { getByText, queryByText } = render(<PlayerModal />);
    const btn125 = getByText('1.25x');

    act(() => fireEvent.press(btn125));
    expect(getByText(/−5% at 1.25× speed/)).toBeTruthy();

    // let it auto-hide
    act(() => jest.advanceTimersByTime(1800));
    expect(queryByText(/−5% at 1.25× speed/)).toBeNull();
  });
});
