// src/components/ui/Confetti.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, View, StyleSheet, Dimensions } from 'react-native';

const PIECES = 40;
const COLORS = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#B28DFF', '#FF8FAB'];

type Piece = {
  x: Animated.Value;
  y: Animated.Value;
  rot: Animated.Value;
  scale: Animated.Value;
  color: string;
  width: number;
  height: number;
  startX: number;
  endX: number;
  endY: number;
  rotTo: number;
  delay: number;
  duration: number;
};

export const Confetti: React.FC<{ trigger: number }> = ({ trigger }) => {
  const { width, height } = Dimensions.get('window');
  // Build static piece definitions once
  const piecesRef = useRef<Piece[] | null>(null);
  if (!piecesRef.current) {
    piecesRef.current = new Array(PIECES).fill(0).map(() => {
      const startX = Math.random() * width;
      const endX = startX + (Math.random() * width * 0.6 - width * 0.3);
      const endY = height * (0.9 + Math.random() * 0.15); // fall off screen bottom-ish
      const rotTo = (Math.random() * 720 - 360) * (Math.random() > 0.5 ? 1 : -1);
      const delay = Math.floor(Math.random() * 200);
      const duration = 1000 + Math.floor(Math.random() * 700);
      const w = 6 + Math.random() * 8;
      const h = 10 + Math.random() * 12;
      return {
        x: new Animated.Value(startX),
        y: new Animated.Value(-40),
        rot: new Animated.Value(0),
        scale: new Animated.Value(0),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        width: w,
        height: h,
        startX,
        endX,
        endY,
        rotTo,
        delay,
        duration,
      };
    }) as any;
  }

  const pieces = piecesRef.current!;

  // Replay animation whenever trigger changes
  useEffect(() => {
    // reset all to start
    pieces.forEach((p) => {
      p.x.setValue(p.startX);
      p.y.setValue(-40);
      p.rot.setValue(0);
      p.scale.setValue(0);
    });

    const anims: Animated.CompositeAnimation[] = [];
    pieces.forEach((p) => {
      anims.push(
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.parallel([
            Animated.timing(p.y, {
              toValue: p.endY,
              duration: p.duration,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(p.x, {
              toValue: p.endX,
              duration: p.duration,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(p.rot, {
              toValue: p.rotTo,
              duration: p.duration,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
            Animated.timing(p.scale, {
              toValue: 1,
              duration: 180,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    });

    Animated.stagger(8, anims).start();

    // no cleanup needed—the next trigger resets values
  }, [trigger, pieces]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => {
        const rotate = p.rot.interpolate({
          inputRange: [-720, 720],
          outputRange: ['-720deg', '720deg'],
        });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              width: p.width,
              height: p.height,
              backgroundColor: p.color,
              borderRadius: 2,
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                { rotate },
                { scale: p.scale },
              ],
              opacity: p.scale, // fade in with scale
            }}
          />
        );
      })}
    </View>
  );
};
