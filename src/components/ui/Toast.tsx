import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, ViewStyle } from 'react-native';
import { THEME } from '../../constants/theme';

export type ToastOptions = {
  duration?: number; // ms
  variant?: 'default' | 'warn' | 'success' | 'error';
};

export type ToastHandle = {
  show: (message: string, options?: ToastOptions) => void;
  hide: () => void;
};

type Props = {
  position?: 'top' | 'bottom';
  style?: ViewStyle;
  backgroundOpacity?: number; // allow per-instance override
};

const BG_OPACITY = 0.75;

const Toast = forwardRef<ToastHandle, Props>(({ position = 'bottom', style, backgroundOpacity }, ref) => {
  const [message, setMessage] = useState('');
  const [variant, setVariant] = useState<ToastOptions['variant']>('default');

  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(16)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = null;
  };

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translate, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  };

  const animateOut = (cb?: () => void) => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 160, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translate, { toValue: 16, duration: 160, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => cb?.());
  };

  useImperativeHandle(ref, () => ({
    show: (msg: string, opts?: ToastOptions) => {
      clearTimer();
      setMessage(msg);
      setVariant(opts?.variant ?? 'default');
      animateIn();

      const dur = Math.max(900, opts?.duration ?? 2000);
      hideTimer.current = setTimeout(() => animateOut(() => setMessage('')), dur);
    },
    hide: () => {
      clearTimer();
      animateOut(() => setMessage(''));
    },
  }));

  if (!message) return null;

  const bg =
    variant === 'warn'
      ? `rgba(255, 165, 0, ${backgroundOpacity ?? BG_OPACITY})`
      : variant === 'success'
      ? `rgba(40, 167, 69, ${backgroundOpacity ?? BG_OPACITY})`
      : variant === 'error'
      ? `rgba(220, 53, 69, ${backgroundOpacity ?? BG_OPACITY})`
      : `rgba(0, 0, 0, ${backgroundOpacity ?? BG_OPACITY})`;

  const containerPosStyle =
    position === 'top'
      ? { top: 24, left: 16, right: 16, transform: [{ translateY: translate }] }
      : { bottom: 24, left: 16, right: 16, transform: [{ translateY: translate.interpolate({ inputRange: [0, 16], outputRange: [0, 16] }) }] };

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        containerPosStyle,
        { opacity, backgroundColor: bg, borderColor: 'rgba(255,255,255,0.15)' },
        style,
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  text: {
    color: THEME.colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default Toast;
