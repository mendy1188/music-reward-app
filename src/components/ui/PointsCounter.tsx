import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../../constants/theme';

type Props = {
  currentPoints: number;
  progress: number; // 0-100
};

const PointsCounter: React.FC<Props> = ({ currentPoints, progress }) => {
  return (
    <View style={styles.container} accessibilityLabel={`Points ${currentPoints}, progress ${Math.floor(progress)} percent`}>
      <Text style={styles.points}>+{currentPoints}</Text>
      <View style={styles.bar}>
        <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, progress))}%` }]} />
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
  caption: { color: THEME.colors.text.secondary, fontSize: 12 }
});

export default PointsCounter;
