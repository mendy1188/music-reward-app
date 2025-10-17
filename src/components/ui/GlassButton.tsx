import React from 'react';
import { Pressable, ActivityIndicator, StyleSheet, Text, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../../constants/theme';

export type GlassButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
  textSmaller?: boolean;
};

export const GlassButton: React.FC<GlassButtonProps> = ({
  title,
  onPress,
  loading,
  disabled,
  style,
  accessibilityLabel,
  textSmaller
}) => {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [styles.container, style, pressed && { opacity: 0.9 }, isDisabled && { opacity: 0.6 }]}>
      <BlurView intensity={25} style={StyleSheet.absoluteFillObject} />
      <LinearGradient
        colors={['rgba(255,255,255,0.08)','rgba(255,255,255,0.03)']}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={[THEME.colors.primary, THEME.colors.secondary]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.border}
      />
      {loading ? (
        <ActivityIndicator />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    overflow: 'hidden',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  border: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    opacity: 0.4,
  },
  text: {
    color: THEME.colors.text.primary,
    fontWeight: '600',
    fontSize: 16,
  },
});

export default GlassButton;
