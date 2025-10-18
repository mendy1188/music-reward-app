import '@testing-library/jest-native/extend-expect';

// Lightweight mocks for native-only modules your tests touch
jest.mock('react-native-track-player', () => ({
  State: { Playing: 'playing', Paused: 'paused', Stopped: 'stopped' },
  Event: {},
  add: jest.fn(),
  reset: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
  seekTo: jest.fn(),
  getRate: jest.fn().mockResolvedValue(1),
  setupPlayer: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success' },
}));

// If you use expo-file-system in tests:
jest.mock('expo-file-system', () => ({
  cacheDirectory: 'file://cache/',
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false }),
  makeDirectoryAsync: jest.fn(),
  downloadAsync: jest.fn().mockResolvedValue({ uri: 'file://cache/fake.mp3' }),
}));
