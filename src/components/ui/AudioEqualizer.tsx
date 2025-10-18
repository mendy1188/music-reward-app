import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { THEME } from '../../constants/theme';

type Props = {
  playing: boolean;
  isCurrentTrack?: boolean;   // ← optional, defaults to false
  height?: number;
  barCount?: number;
  barWidth?: number;
  gap?: number;
  color?: string;
  idlePct?: number;
};

const AudioEqualizer: React.FC<Props> = ({
  playing,
  isCurrentTrack = false,          // ← default
  height = 48,
  barCount = 44,
  barWidth = 4,
  gap = 3,
  color = THEME.colors.secondary,
  idlePct = 0.18,
}) => {
  const bars = useMemo(
    () => Array.from({ length: barCount }, () => new Animated.Value(idlePct)),
    [barCount, idlePct]
  );
  const loopsRef = useRef<Animated.CompositeAnimation[]>([]);

  // ✅ animate only when this visualizer represents the current track AND playback is running
  const active = playing && isCurrentTrack;

  useEffect(() => {
    // stop any previous loops
    loopsRef.current.forEach((a) => a.stop());
    loopsRef.current = [];

    if (!active) {
      // settle to idle height
      bars.forEach((v) => {
        Animated.timing(v, {
          toValue: idlePct,
          duration: 240,
          useNativeDriver: false,
        }).start();
      });
      return;
    }

    // when active: each bar loops between random heights
    bars.forEach((v, i) => {
      const animateOne = () =>
        Animated.sequence([
          Animated.timing(v, {
            toValue: Math.random() * 0.9 + 0.1,
            duration: 220 + Math.random() * 220,
            useNativeDriver: false,
          }),
          Animated.timing(v, {
            toValue: Math.random() * 0.8 + 0.1,
            duration: 220 + Math.random() * 220,
            useNativeDriver: false,
          }),
        ]);

      const loop = Animated.loop(
        Animated.sequence([Animated.delay(i * 18), animateOne()])
      );

      loopsRef.current.push(loop);
      loop.start();
    });

    return () => {
      loopsRef.current.forEach((a) => a.stop());
      loopsRef.current = [];
    };
  }, [active, bars, idlePct]);


  return (
    <View
      style={[
        styles.wrap,
        { height, paddingVertical: 4 },
      ]}
      pointerEvents="none"
      accessibilityLabel={playing ? 'Audio visualizer playing' : 'Audio visualizer paused'}
    >
      {bars.map((v, idx) => {
        const barHeight = v.interpolate({
          inputRange: [0, 1],
          outputRange: [2, height - 8], // keep some top/bottom padding
        });
        return (
          <Animated.View
            key={idx}
            style={[
              styles.bar,
              {
                width: barWidth,
                marginHorizontal: gap / 2,
                height: barHeight,
                backgroundColor: color,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)', // subtle track so it’s visible
    overflow: 'hidden',
  },
  bar: {
    borderRadius: 2,
  },
});

export default AudioEqualizer;
