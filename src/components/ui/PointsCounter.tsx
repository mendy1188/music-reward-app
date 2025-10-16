import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { THEME } from '../../constants/theme';

type Props = {
  currentPoints: number;
  progress: number; //Progress percentage from 0–100
};

const PointsCounter: React.FC<Props> = ({ currentPoints, progress }) => {
  // Animated width value (0–100)
  const w = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const clamped = Math.min(100, Math.max(0, progress));
    Animated.timing(w, {
      toValue: clamped,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // animating width, so must be false
    }).start();
  }, [progress, w]);

  const widthStyle = {
    width: w.interpolate({
      inputRange: [0, 100],
      outputRange: ['0%', '100%'],
    }),
  };

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel="Listening progress"
      accessibilityValue={{ now: Math.round(progress), min: 0, max: 100, text: `${Math.round(progress)}%` }}
    >
      <Text style={styles.points}>+{currentPoints}</Text>

      <View style={styles.bar}>
        <Animated.View style={[styles.fill, widthStyle]} />
      </View>

      <Text style={styles.caption}>Listening progress</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 8 },
  points: { color: THEME.colors.accent, fontSize: 28, fontWeight: '700' },
  bar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: THEME.colors.secondary,
  },
  caption: { color: THEME.colors.text.secondary, fontSize: 12 },
});

export default PointsCounter;
