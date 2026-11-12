import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NativeSplashScreen from 'react-native-splash-screen';

import { initializeApp } from './src/bootstrap/initializeApp';
import AppNavigator from './Navigation';
import ToastHost from './src/components/ToastHost';
import BrandSplash from './src/components/BrandSplash';

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const hideSplash = () => {
      try {
        NativeSplashScreen.hide();
      } catch {
        // native splash already gone
      }
    };

    // Hand off to the JS launch splash so the entrance animation is visible.
    // Native launch screens cannot animate and do not update on Fast Refresh.
    hideSplash();

    const splashTimeout = setTimeout(hideSplash, 2500);

    initializeApp()
      .then(() => {
        if (isMounted) {
          setIsReady(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsReady(true);
        }
      })
      .finally(() => {
        clearTimeout(splashTimeout);
        hideSplash();
      });

    return () => {
      isMounted = false;
      clearTimeout(splashTimeout);
    };
  }, []);

  if (!isReady) {
    return (
      <SafeAreaProvider>
        <BrandSplash />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <AppNavigator />
        {/* Floatr: <Toasts /> sibling overlay — not inside the navigator */}
        <ToastHost />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
