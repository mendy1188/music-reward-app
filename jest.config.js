/** @type {import('jest').Config} */
module.exports = {
	preset: 'jest-expo',
	testEnvironment: 'jsdom',
	setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
	testMatch: ['**/__tests__/**/*.test.{ts,tsx,js,jsx}'],
	transformIgnorePatterns: [
		'node_modules/(?!(react-native|@react-native|expo(nent)?|@expo(nent)?/.*|expo-router|react-native-track-player|@react-native-community|react-native-reanimated)/)',
	],
	moduleNameMapper: {
		'\\.(css|less|scss)$': 'identity-obj-proxy',
	},
	resetMocks: true,
};
