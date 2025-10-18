import React, { type ReactNode, type ErrorInfo, Component } from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  // mark the class field as overriding the base class property
  override state: Readonly<State> = { hasError: false };

  static getDerivedStateFromError(_: unknown): State {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container} accessibilityRole="alert">
          <Text style={styles.title}>Something went wrong.</Text>
          <Text style={styles.msg}>Please try again or restart the app.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#7f1d1d' },
  title: { color: '#fff', fontWeight: '700', fontSize: 16, marginBottom: 4 },
  msg: { color: 'rgba(255,255,255,0.9)' },
});

export default ErrorBoundary;
