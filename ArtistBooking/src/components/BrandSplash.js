import React, {useEffect, useState} from 'react';
import {AccessibilityInfo, Image, StatusBar, StyleSheet, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const LOGO = require('../../assets/artsy-logo.png');

export default function BrandSplash() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const logoScale = useSharedValue(0.62);
  const logoOpacity = useSharedValue(0);
  const logoRotate = useSharedValue(-8);
  const glowScale = useSharedValue(0.7);
  const glowOpacity = useSharedValue(0);
  const titleY = useSharedValue(14);
  const titleOpacity = useSharedValue(0);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      logoScale.value = 1;
      logoOpacity.value = 1;
      logoRotate.value = 0;
      glowScale.value = 1;
      glowOpacity.value = 1;
      titleY.value = 0;
      titleOpacity.value = 1;
      return;
    }

    logoOpacity.value = withTiming(1, {duration: 280});
    logoScale.value = withSpring(1, {damping: 12, stiffness: 150, mass: 0.75});
    logoRotate.value = withSpring(0, {damping: 14, stiffness: 140});
    glowOpacity.value = withTiming(1, {duration: 420});
    glowScale.value = withTiming(1, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
    titleOpacity.value = withTiming(1, {duration: 420});
    titleY.value = withSpring(0, {damping: 16, stiffness: 140});
  }, [
    reduceMotion,
    glowOpacity,
    glowScale,
    logoOpacity,
    logoRotate,
    logoScale,
    titleOpacity,
    titleY,
  ]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      {scale: logoScale.value},
      {rotate: `${logoRotate.value}deg`},
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{scale: glowScale.value}],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{translateY: titleY.value}],
  }));

  return (
    <LinearGradient
      colors={['#7157FF', '#8B6CFF', '#9B7BFF']}
      locations={[0, 0.55, 1]}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.orbA} />
      <View style={styles.orbB} />
      <View style={styles.stage}>
        <Animated.View style={[styles.glow, glowStyle]} />
        <Animated.View style={[styles.logoWrap, logoStyle]}>
          <Image source={LOGO} style={styles.logo} resizeMode="cover" />
        </Animated.View>
      </View>
      <Animated.Text style={[styles.title, titleStyle]}>Artsy</Animated.Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbA: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: -80,
    right: -70,
  },
  orbB: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.07)',
    bottom: -60,
    left: -80,
  },
  stage: {
    width: 148,
    height: 148,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 148,
    height: 148,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  logoWrap: {
    width: 112,
    height: 112,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#7157FF',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    marginTop: 8,
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
});
