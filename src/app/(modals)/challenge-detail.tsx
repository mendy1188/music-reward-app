import React, { useMemo } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useMusicStore } from '../../stores/musicStore';
import { GlassCard } from '../../components/ui/GlassCard';
import GlassButton from '../../components/ui/GlassButton';
import { THEME } from '../../constants/theme';

export default function ChallengeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const challenges = useMusicStore(s => s.challenges);
  const challenge = useMemo(() => challenges.find(c => c.id === id), [challenges, id]);
  const setCurrentTrack = useMusicStore(s => s.setCurrentTrack);

  if (!challenge) {
    return <View style={styles.center}><Text style={{ color: 'white' }}>Challenge not found</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: challenge.title, presentation: 'modal' }} />
      <GlassCard style={styles.card}>
        <Text style={styles.title}>{challenge.title}</Text>
        <Text style={styles.meta}>{challenge.artist} • {Math.round(challenge.duration/60)}m</Text>
        <Text style={styles.desc}>{challenge.description}</Text>
        <Text style={styles.points}>{challenge.points} pts</Text>
        <GlassButton title="Play & Earn" onPress={() => { setCurrentTrack(challenge); router.push('/(modals)/player'); }} />
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.colors.background },
  card: { padding: 16 },
  title: { color: 'white', fontWeight: '700', fontSize: 22, marginBottom: 8 },
  meta: { color: 'rgba(255,255,255,0.7)', marginBottom: 12 },
  desc: { color: 'rgba(255,255,255,0.9)', marginBottom: 16 },
  points: { color: THEME.colors.accent, marginBottom: 16, fontWeight: '700' },
});
