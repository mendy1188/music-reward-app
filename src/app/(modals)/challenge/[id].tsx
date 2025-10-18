import React, { useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Alert,
    Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GlassCard, GlassButton } from '../../../components/ui/GlassCard';
import { THEME } from '../../../constants/theme';
import { PLAYBACK_RULES as RULES } from '../../../constants/rules';
import { useMusicPlayer } from '../../../hooks/useMusicPlayer';
import { useMusicStore, selectChallenges, selectCurrentTrack } from '../../../stores/musicStore';
import AudioEqualizer from '../../../components/ui/AudioEqualizer';

export default function ChallengeDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const challenges = useMusicStore(selectChallenges);
    const currentTrackFromStore = useMusicStore(selectCurrentTrack);

    const {
        currentTrack,
        isPlaying,
        currentPosition,
        duration,
        play,
        pause,
        resume,
        seekTo,
        loading,
        error,
    } = useMusicPlayer();

    const challenge = useMemo(
        () => challenges.find((c) => c.id === id),
        [challenges, id]
    );

    const busyWithAnotherChallenge = useMemo(() => {
        if (!challenge) return false;
        const p = challenge.progress ?? 0;
        return !challenge.completed && p < (RULES.COMPLETION_THRESHOLD_PCT ?? 90);
      }, [challenge]);

    // Simple toast for local UX
    const [toast, setToast] = useState<string>('');
    const toastAnim = useRef(new Animated.Value(0)).current;
    const showToast = (msg: string) => {
        setToast(msg);
        Animated.timing(toastAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start(() => {
            setTimeout(() => {
                Animated.timing(toastAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
                    setToast('');
                });
            }, 1400);
        });
    };

    if (!challenge) {
        return (
            <SafeAreaView style={styles.container}>
                <GlassCard style={{ margin: THEME.spacing.lg }}>
                    <Text style={styles.notFound}>Challenge not found.</Text>
                    <GlassButton title="Go back" onPress={() => router.back()} variant="secondary" />
                </GlassCard>
            </SafeAreaView>
        );
    }

    const formatTime = (seconds: number): string => {
        const m = Math.floor((seconds || 0) / 60);
        const s = Math.floor((seconds || 0) % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const isThisPlaying = currentTrack?.id === challenge.id && isPlaying;
    const liveProgressPct =
        currentTrack?.id === challenge.id && duration > 0
            ? Math.min(100, Math.max(0, (currentPosition / duration) * 100))
            : challenge.progress;

    const handlePlayPress = async () => {
        // Don’t allow switching while another challenge is mid-session (your existing rule)
        if (
            currentTrackFromStore &&
            currentTrackFromStore.id !== challenge.id &&
            (isPlaying || (currentTrack?.progress ?? 0) < RULES.COMPLETION_THRESHOLD_PCT)
        ) {
            showToast('Finish the current challenge first');
            return;
        }

        if (currentTrack?.id === challenge.id) {
            if (isPlaying) {
                pause();
            } else {
                resume();
            }
            return;
        }

        try {
            await play(challenge);
        } catch (e) {
            Alert.alert('Playback Error', String(e instanceof Error ? e.message : e));
        }
    };

    const handleSeek = (percentage: number) => {
        // Only allow seeking current track
        if (!duration || currentTrack?.id !== challenge.id) return;
        const next = (percentage / 100) * duration;
        seekTo(next);
    };

    // Compute a simple “penalties applied” summary if completed
    const penaltyLines: string[] = [];
    if (challenge.completed) {
        const seekPct = (RULES.FORWARD_SEEK_PENALTY_PCT || 0) * 100;
        if (challenge.forwardSeeks && seekPct > 0) {
            penaltyLines.push(`−${challenge.forwardSeeks * seekPct}% for ${challenge.forwardSeeks} skips`);
        }
        if (challenge.peakRate && RULES.RATE_PENALTY_PCT) {
            const ratePenalty = (RULES.RATE_PENALTY_PCT as Record<number, number>)[challenge.peakRate] ?? 0;
            if (ratePenalty > 0) penaltyLines.push(`−${Math.round(ratePenalty * 100)}% for ${challenge.peakRate}× speed`);
        }
        if (challenge.pointsDeducted && challenge.pointsDeducted > 0) {
            penaltyLines.push(`Total deducted: ${challenge.pointsDeducted}`);
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {/* Info */}
                <GlassCard style={styles.card}>
                    <Text style={styles.title}>{challenge.title}</Text>
                    <Text style={styles.artist}>{challenge.artist}</Text>
                    {challenge.description ? (
                        <Text style={styles.desc}>{challenge.description}</Text>
                    ) : null}
                    <View style={styles.pointsRow}>
                        <Text style={styles.pointsLabel}>Challenge Points</Text>
                        <Text style={styles.pointsValue}>{challenge.points}</Text>
                    </View>
                    <View style={styles.pointsRow}>
                        <Text style={styles.pointsLabel}>Points Earn</Text>
                        <Text style={styles.pointsValue}>{challenge.completed ? (challenge.points - (challenge.pointsDeducted ?? 0)) : 0}</Text>
                    </View>
                    {/* Penalties (if completed) */}
                    {challenge.completed && penaltyLines.length > 0 ? (
                        <View style={{ marginTop: THEME.spacing.sm }}>
                            {penaltyLines.map((l, i) => (
                                <Text key={i} style={styles.penaltyText}>• {l}</Text>
                            ))}
                        </View>
                    ) : null}
                </GlassCard>

                {/* Progress */}
                <GlassCard style={styles.card}>
                    <Text style={styles.sectionTitle}>Progress</Text>

                    {/* Progress bar */}
                    <TouchableOpacity
                        style={styles.progressTrack}
                        onPress={(event) => {
                            const { locationX, width } = event.nativeEvent as any;
                            const pct = (locationX / width) * 100;
                            handleSeek(pct);
                        }}
                        disabled={true}
                    >
                        <View style={styles.progressBackground}>
                            <View style={[styles.progressFill, { width: `${Math.round(liveProgressPct)}%` }]} />
                        </View>
                    </TouchableOpacity>

                    <View style={styles.timeRow}>
                        <Text style={styles.timeText}>
                            {currentTrack?.id === challenge.id ? formatTime(currentPosition) : '0:00'}
                        </Text>
                        <Text style={styles.timeText}>
                            {currentTrack?.id === challenge.id ? formatTime(duration) : formatTime(challenge.duration || 0)}
                        </Text>
                    </View>

                    <Text style={styles.progressPct}>
                        {challenge.completed ? 'Completed' : `${Math.round(liveProgressPct)}%`}
                    </Text>
                </GlassCard>

                {/* Actions */}
                <GlassCard style={styles.card}>
                    <AudioEqualizer playing={isPlaying} isCurrentTrack={currentTrack?.id === challenge.id} height={48} />
                    <View style={styles.row}>
                        <GlassButton
                            title={
                                currentTrack?.id === challenge.id
                                    ? isThisPlaying ? '⏸︎ Pause' : '▶︎ Resume'
                                    : '▶︎ Play'
                            }
                            accessibilityLabel={
                                currentTrack?.id === challenge.id 
                                    ? isThisPlaying ? "Pause playback" : "Resume playback" 
                                    : "Play track"
                                }
                            onPress={handlePlayPress}
                            variant="primary"
                            loading={loading}
                            style={{ flex: 1 }}
                        />
                    </View>

                    {/* Re-earn rule hint */}
                    {challenge.completed && !RULES.ALLOW_REEARN_ON_REPLAY ? (
                        <Text style={styles.hint}>Replays won’t award additional points.</Text>
                    ) : null}
                </GlassCard>
            </View>

            {/* Toast */}
            {toast ? (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.toast,
                        {
                            opacity: toastAnim,
                            transform: [
                                {
                                    translateY: toastAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [24, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    <Text style={styles.toastText}>{toast}</Text>
                </Animated.View>
            ) : null}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: THEME.colors.background },
    header: {
        paddingHorizontal: THEME.spacing.md,
        paddingVertical: THEME.spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: { color: THEME.colors.text.primary, fontSize: THEME.fonts.sizes.lg, fontWeight: '700' },

    content: { flex: 1, padding: THEME.spacing.lg, gap: THEME.spacing.md },
    card: { padding: THEME.spacing.md },

    title: { color: THEME.colors.text.primary, fontSize: THEME.fonts.sizes.xl, fontWeight: '800', textAlign: 'center' },
    artist: { color: THEME.colors.text.secondary, textAlign: 'center', marginTop: 4 },
    desc: { color: THEME.colors.text.tertiary, textAlign: 'center', marginTop: THEME.spacing.sm },

    pointsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: THEME.spacing.md },
    pointsLabel: { color: THEME.colors.text.secondary },
    pointsValue: { color: THEME.colors.accent, fontWeight: '800', fontSize: THEME.fonts.sizes.xl },

    sectionTitle: { color: THEME.colors.text.primary, fontWeight: '700', marginBottom: THEME.spacing.sm, textAlign: 'center' },

    progressTrack: { marginTop: THEME.spacing.sm, marginBottom: THEME.spacing.sm },
    progressBackground: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: THEME.colors.accent, borderRadius: 4 },

    timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: THEME.spacing.xs },
    timeText: { color: THEME.colors.text.secondary, fontSize: THEME.fonts.sizes.sm },
    progressPct: { color: THEME.colors.accent, fontWeight: '700', textAlign: 'center', marginTop: THEME.spacing.xs },

    penaltyText: { color: THEME.colors.text.secondary, fontSize: THEME.fonts.sizes.sm },

    row: { flexDirection: 'row', gap: THEME.spacing.sm, marginTop: 8 },

    hint: { color: THEME.colors.text.tertiary, marginTop: THEME.spacing.sm, textAlign: 'center', fontSize: THEME.fonts.sizes.sm },

    toast: {
        position: 'absolute',
        bottom: 24,
        left: 16,
        right: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.75)',
        alignItems: 'center',
    },
    toastText: { color: '#fff', fontSize: THEME.fonts.sizes.sm, fontWeight: '600' },

    notFound: { color: THEME.colors.text.primary, fontWeight: '700', marginBottom: THEME.spacing.sm },
});
