import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  StyleSheet as RNStyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { GlassCard, GlassButton } from '../../components/ui/GlassCard';
import { useMusicPlayer } from '../../hooks/useMusicPlayer';
import { THEME } from '../../constants/theme';
import { PLAYBACK_RULES as RULES } from '../../constants/rules';
import AudioEqualizer from '../../components/ui/AudioEqualizer';
import { Confetti } from '../../components/ui/Confetti';
import Toast, { ToastHandle } from '../../components/ui/Toast';

export default function PlayerModal() {
  const [burst, setBurst] = useState(0);
  const wasCompletedRef = useRef<boolean>(false);
  const toastRef = useRef<ToastHandle>(null);

  const {
    currentTrack,
    isPlaying,
    currentPosition,
    duration,
    pause,
    resume,
    seekTo,
    setRate,
    loading,
    error,
  } = useMusicPlayer();

  // fire confetti exactly when completion flips to true
  useEffect(() => {
    if (!currentTrack) return;
    const prev = wasCompletedRef.current;
    const now = !!currentTrack.completed;
    if (!prev && now) {
      setBurst((b) => b + 1);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
    wasCompletedRef.current = now;
  }, [currentTrack?.completed]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor((seconds || 0) / 60);
    const secs = Math.floor((seconds || 0) % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = (): number => {
    if (!duration || duration === 0) return 0;
    return (currentPosition / duration) * 100;
  };

  // Seek handler — show skip penalty toast when applicable
  const handleSeek = (percentage: number) => {
    if (!duration) return;
    const newPosition = (percentage / 100) * duration;

    if (newPosition > currentPosition + (RULES.FORWARD_SEEK_THRESHOLD_SEC || 0)) {
      const pct = Math.round((RULES.FORWARD_SEEK_PENALTY_PCT || 0) * 100);
      if (pct > 0) toastRef.current?.show(`−${pct}% for skipping forward`, { variant: 'warn' });
    }
    seekTo(newPosition);
  };

  const handlePlayPause = async () => {
    if (isPlaying) {
      pause();
    } else if (currentTrack) {
      resume();
    }
  };

  if (error) Alert.alert('Playback Error', error);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <GlassCard>
          <Text style={styles.noTrackSubtext}>Loading…</Text>
        </GlassCard>
      </SafeAreaView>
    );
  }

  if (!currentTrack) {
    return (
      <SafeAreaView style={styles.container}>
        <GlassCard style={styles.noTrackCard}>
          <Text style={styles.noTrackText}>No track selected</Text>
          <Text style={styles.noTrackSubtext}>
            Go back and select a challenge to start playing music
          </Text>
        </GlassCard>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Track Info */}
        <GlassCard style={styles.trackInfoCard}>
          <Text style={styles.trackTitle}>{currentTrack.title}</Text>
          <Text style={styles.trackArtist}>{currentTrack.artist}</Text>
          <Text style={styles.trackDescription}>{currentTrack.description}</Text>

          <View style={styles.pointsContainer}>
            <Text style={styles.pointsLabel}>Challenge Points</Text>
            <Text style={styles.pointsValue}>{currentTrack.points}</Text>
          </View>
        </GlassCard>

        {/* Progress Section */}
        <GlassCard style={styles.progressCard}>
          <Text style={styles.progressLabel}>Listening Progress</Text>
          <AudioEqualizer playing={isPlaying} isCurrentTrack={true} height={48} />

          {/* Progress Bar (disabled tap-seek for now) */}
          <TouchableOpacity
            style={styles.progressTrack}
            onPress={(event) => {
              const { locationX, width } = event.nativeEvent as any;
              const percentage = (locationX / width) * 100;
              handleSeek(percentage);
            }}
            disabled
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel="Seek in track"
            accessibilityHint="Double tap and hold, then slide left or right to seek"
          >
            <View style={styles.progressBackground}>
              <View style={[styles.progressFill, { width: `${getProgress()}%` }]} />
            </View>
          </TouchableOpacity>

          {/* Time Display */}
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(currentPosition)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>

          {/* Progress Percentage */}
          <Text style={styles.progressPercentage}>
            {Math.round(getProgress())}% Complete
          </Text>
        </GlassCard>

        {/* Controls */}
        <GlassCard style={styles.controlsCard}>
          <View style={styles.controlsRow}>
            <GlassButton
              accessibilityLabel="Rewind 10 seconds"
              accessibilityHint="Tap to go back ten seconds."
              title="⏪ 10s"
              onPress={() =>
                handleSeek(Math.max(0, getProgress() - (10 / (duration || 1)) * 100))
              }
              variant="secondary"
              style={styles.controlButton}
            />

            <GlassButton
              title={loading ? '...' : isPlaying ? '⏸️ Pause' : '▶️ Play'}
              accessibilityLabel={isPlaying ? 'Pause playback' : 'Play track'}
              onPress={handlePlayPause}
              variant="primary"
              style={styles.mainControlButton}
              loading={loading}
            />

            <GlassButton
              accessibilityLabel="Forward 10 seconds"
              accessibilityHint="Tap to go forward ten seconds."
              title="⏩ 10s"
              onPress={() =>
                handleSeek(Math.min(100, getProgress() + (10 / (duration || 1)) * 100))
              }
              variant="secondary"
              style={styles.controlButton}
            />
          </View>

          {/* Speed buttons — toast shows penalty per rate */}
          <View style={[styles.controlsRow, { marginTop: THEME.spacing.sm }]}>
            {([0.5, 1.0, 1.25, 2.0] as const).map((r) => (
              <GlassButton
                key={r}
                title={`${r}x`}
                onPress={async () => {
                  try { await Haptics.selectionAsync(); } catch {}
                  setRate?.(r);

                  const penaltyPct = (RULES.RATE_PENALTY_PCT as Record<number, number>)[r] ?? 0;
                  if (penaltyPct > 0) {
                    const pct = Math.round(penaltyPct * 100);
                    toastRef.current?.show(`−${pct}% at ${r}× speed`, { variant: 'warn' });
                  }
                }}
                variant="secondary"
                style={styles.controlButton}
                accessibilityLabel={`Set playback speed to ${r}x`}
                accessibilityHint={`Plays ${r} times ${r < 1 ? 'slower' : 'faster'} than normal`}
              />
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </GlassCard>

        {/* Challenge Progress */}
        <GlassCard style={styles.challengeCard}>
          <Text style={styles.challengeLabel}>Challenge Status</Text>
          <View style={styles.challengeInfo}>
            <Text
              style={[
                styles.challengeStatus,
                {
                  color: currentTrack.completed
                    ? THEME.colors.secondary
                    : THEME.colors.accent,
                },
              ]}
            >
              {(currentTrack.completed || Math.round(getProgress()) >= 90)
                ? '✅ Completed'
                : '🎧 In Progress'}
            </Text>
            <Text style={styles.challengeProgress}>
              {currentTrack.completed
                ? Math.round(currentTrack.progress)
                : Math.round(getProgress())}% of challenge complete
            </Text>
          </View>
        </GlassCard>

        {/* Confetti overlay */}
        <View
          pointerEvents="none"
          style={{
            ...RNStyleSheet.absoluteFillObject,
            zIndex: 9999,
            elevation: 9999,
          }}
        >
          <Confetti trigger={burst} />
        </View>

        <Toast ref={toastRef} position="bottom" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  content: { flex: 1, padding: THEME.spacing.lg, justifyContent: 'space-between' },
  noTrackCard: { margin: THEME.spacing.xl, alignItems: 'center' },
  noTrackText: {
    fontSize: THEME.fonts.sizes.xl,
    fontWeight: 'bold',
    color: THEME.colors.text.primary,
    marginBottom: THEME.spacing.sm,
  },
  noTrackSubtext: { fontSize: THEME.fonts.sizes.md, color: THEME.colors.text.secondary, textAlign: 'center' },
  trackInfoCard: { alignItems: 'center' },
  trackTitle: { fontSize: THEME.fonts.sizes.xxl, fontWeight: 'bold', color: THEME.colors.text.primary, textAlign: 'center', marginBottom: THEME.spacing.xs },
  trackArtist: { fontSize: THEME.fonts.sizes.lg, color: THEME.colors.text.secondary, marginBottom: THEME.spacing.md, textAlign: 'center' },
  trackDescription: { fontSize: THEME.fonts.sizes.sm, color: THEME.colors.text.tertiary, textAlign: 'center', marginBottom: THEME.spacing.lg },
  pointsContainer: { alignItems: 'center' },
  pointsLabel: { fontSize: THEME.fonts.sizes.sm, color: THEME.colors.text.secondary },
  pointsValue: { fontSize: THEME.fonts.sizes.xl, fontWeight: 'bold', color: THEME.colors.accent },
  progressCard: {},
  progressLabel: { fontSize: THEME.fonts.sizes.md, fontWeight: '600', color: THEME.colors.text.primary, textAlign: 'center', marginBottom: THEME.spacing.md },
  progressTrack: { marginBottom: THEME.spacing.md },
  progressBackground: { height: 8, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: THEME.colors.accent, borderRadius: 4 },
  timeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: THEME.spacing.sm },
  timeText: { fontSize: THEME.fonts.sizes.sm, color: THEME.colors.text.secondary },
  progressPercentage: { fontSize: THEME.fonts.sizes.lg, fontWeight: 'bold', color: THEME.colors.accent, textAlign: 'center' },
  controlsCard: {},
  controlsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  controlButton: { flex: 0.30, marginHorizontal: THEME.spacing.xs },
  mainControlButton: { flex: 0.4, marginHorizontal: THEME.spacing.xs },
  errorText: { color: '#FF6B6B', fontSize: THEME.fonts.sizes.sm, textAlign: 'center', marginTop: THEME.spacing.md },
  challengeCard: {},
  challengeLabel: { fontSize: THEME.fonts.sizes.md, fontWeight: '600', color: THEME.colors.text.primary, textAlign: 'center', marginBottom: THEME.spacing.md },
  challengeInfo: { alignItems: 'center' },
  challengeStatus: { fontSize: THEME.fonts.sizes.lg, fontWeight: 'bold', marginBottom: THEME.spacing.xs },
  challengeProgress: { fontSize: THEME.fonts.sizes.sm, color: THEME.colors.text.secondary },
});
