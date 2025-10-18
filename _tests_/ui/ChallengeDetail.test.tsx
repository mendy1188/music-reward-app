import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ChallengeDetail from '../../src/app/(modals)/challenge/[id]';
import { useMusicStore } from '../../src/stores/musicStore';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 't1' }),
  useRouter: () => ({ back: jest.fn() }),
}));

// Don’t run real hook logic here; we only render static UI info
jest.mock('../../src/hooks/useMusicPlayer', () => ({
  useMusicPlayer: () => ({
    currentTrack: { id: 't1' },
    isPlaying: false,
    currentPosition: 0,
    duration: 120,
    play: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    seekTo: jest.fn(),
    loading: false,
    error: null,
  }),
}));

jest.mock('../../src/constants/theme', () => ({
  SAMPLE_CHALLENGES: [
    { id: 't1', title: 'Track 1', artist: 'A', duration: 120, points: 300, description: 'D' },
  ],
  THEME: { colors: { text: { primary: '#fff', secondary: '#aaa', tertiary: '#888' }, accent: '#0f0' }, fonts: { sizes: { sm: 12, md: 14, xl: 18 } }, spacing: { sm: 6, md: 10, lg: 16 } },
}));

describe('ChallengeDetail modal', () => {
  beforeEach(() => {
    useMusicStore.setState({
      challenges: [
        { id: 't1', title: 'Track 1', artist: 'A', duration: 120, points: 300, progress: 0, completed: false },
      ],
      currentTrack: { id: 't1', title: 'Track 1', artist: 'A', duration: 120, points: 300, progress: 0, completed: false },
      isPlaying: false,
      currentPosition: 0,
      completedChallenges: [],
      deductionsById: {},
    } as any);
  });

  it('renders title and points', () => {
    render(<ChallengeDetail />);
    expect(screen.getByText('Track 1')).toBeTruthy();
    expect(screen.getByText('Challenge Points')).toBeTruthy();
    expect(screen.getByText('300')).toBeTruthy();
  });
});
