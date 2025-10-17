// Home screen - Challenge list (Expo Router)
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Animated } from 'react-native';
import { router } from 'expo-router';
import { ChallengeCard } from '../../components/challenge/ChallengeCard';
import { useMusicPlayer } from '../../hooks/useMusicPlayer';
import { useMusicStore, selectChallenges, selectCurrentTrack, selectIsPlaying } from '../../stores/musicStore';
import { THEME } from '../../constants/theme';
import { PLAYBACK_RULES as RULES } from '../../constants/rules';
import type { MusicChallenge } from '../../types';

export default function HomeScreen() {
  const challenges = useMusicStore(selectChallenges);
  const currentTrack = useMusicStore(selectCurrentTrack);
  //const isPlaying = useMusicStore(selectIsPlaying);
  const setCurrentTrack = useMusicStore(s => s.setCurrentTrack);
  //const { play } = useMusicPlayer();
  const { isPlaying, play } = useMusicPlayer();

  const currentChallenge = useMemo(
    () => challenges.find(c => c.id === currentTrack?.id),
    [challenges, currentTrack]
  );

  const busyWithAnotherChallenge = useMemo(() => {
    if (!currentChallenge) return false;
    const p = currentChallenge.progress ?? 0;
    return !currentChallenge.completed && p < (RULES.COMPLETION_THRESHOLD_PCT ?? 90);
  }, [currentChallenge]);

  // toast
  const [showBlockToast, setShowBlockToast] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(toastAnim, { toValue: showBlockToast ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [showBlockToast, toastAnim]);
  const flashBlockToast = () => {
    setShowBlockToast(true);
    setTimeout(() => setShowBlockToast(false), 1400);
  };

  const handlePlayChallenge = async (challenge: MusicChallenge) => {
    // block starting *another* challenge mid-run
    if (busyWithAnotherChallenge && challenge.id !== currentTrack?.id) {
      flashBlockToast();
      return;
    }
    try {
      await play(challenge);
      router.push('/(modals)/player');
    } catch (error) {
      console.error('Failed to play challenge:', error);
    }
  };

  //open card should reopen player if it's the current track OR completed
  const handleOpenCard = (challenge: MusicChallenge) => {
    const isCurrent = challenge.id === currentTrack?.id;
    if (isCurrent || challenge.completed) {
      // ✅ Only set when different
      if (!isCurrent) setCurrentTrack(challenge);
      router.push('/(modals)/player');
    } else if (busyWithAnotherChallenge) {
      flashBlockToast();
    }
  };

  const renderChallenge = ({ item }: { item: MusicChallenge }) => {
    const isThisCurrent = currentTrack?.id === item.id;
    const disablePlay = !isThisCurrent && busyWithAnotherChallenge;
    return (
      <ChallengeCard
        challenge={item}
        onPlay={handlePlayChallenge}
        onOpenCard={handleOpenCard}      // 👈 NEW
        isCurrentTrack={isThisCurrent}
        isPlaying={isPlaying}
        disablePlay={disablePlay}
      />
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Music Challenges</Text>
      <Text style={styles.subtitle}>Complete listening challenges to earn points and unlock achievements</Text>
      <FlatList
        data={challenges}
        renderItem={renderChallenge}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.toast,
          {
            opacity: toastAnim,
            transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          },
        ]}
      >
        <Text style={styles.toastText}>Finish your current challenge first</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background, paddingHorizontal: THEME.spacing.md, paddingTop: THEME.spacing.lg },
  header: { fontSize: THEME.fonts.sizes.xxl, fontWeight: 'bold', color: THEME.colors.text.primary, marginBottom: THEME.spacing.sm, textAlign: 'center' },
  subtitle: { fontSize: THEME.fonts.sizes.sm, color: THEME.colors.text.secondary, textAlign: 'center', marginBottom: THEME.spacing.lg },
  listContainer: { paddingBottom: THEME.spacing.xl },
  toast: { position: 'absolute', bottom: 24, left: 16, right: 16, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center' },
  toastText: { color: '#fff', fontSize: THEME.fonts.sizes.sm, fontWeight: '600' },
});
