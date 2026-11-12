import React, {useEffect, useState} from 'react';
import {
  AccessibilityInfo,
  Dimensions,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';

const {width} = Dimensions.get('window');
const LOGO = require('../../assets/artsy-logo.png');
const CATEGORIES = ['Makeup', 'Mehendi', 'DJ', 'Singer'];

export default function WelcomeSplashScreen({navigation}) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const logoScale = useSharedValue(0.62);
  const logoOpacity = useSharedValue(0);
  const logoRotate = useSharedValue(-8);
  const glowScale = useSharedValue(0.7);
  const glowOpacity = useSharedValue(0);
  const titleY = useSharedValue(14);
  const titleOpacity = useSharedValue(0);
  const bodyY = useSharedValue(14);
  const bodyOpacity = useSharedValue(0);
  const ctaY = useSharedValue(14);
  const ctaOpacity = useSharedValue(0);

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
      bodyY.value = 0;
      bodyOpacity.value = 1;
      ctaY.value = 0;
      ctaOpacity.value = 1;
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
    titleOpacity.value = withDelay(180, withTiming(1, {duration: 420}));
    titleY.value = withDelay(180, withSpring(0, {damping: 16, stiffness: 140}));
    bodyOpacity.value = withDelay(320, withTiming(1, {duration: 420}));
    bodyY.value = withDelay(320, withSpring(0, {damping: 16, stiffness: 140}));
    ctaOpacity.value = withDelay(460, withTiming(1, {duration: 420}));
    ctaY.value = withDelay(460, withSpring(0, {damping: 16, stiffness: 140}));
  }, [
    reduceMotion,
    bodyOpacity,
    bodyY,
    ctaOpacity,
    ctaY,
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

  const bodyStyle = useAnimatedStyle(() => ({
    opacity: bodyOpacity.value,
    transform: [{translateY: bodyY.value}],
  }));

  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{translateY: ctaY.value}],
  }));

  return (
    <LinearGradient
      colors={['#7157FF', '#8B6CFF', '#9B7BFF']}
      locations={[0, 0.55, 1]}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.orbA} />
        <View style={styles.orbB} />

        <View style={styles.stage}>
          <Animated.View style={[styles.glow, glowStyle]} />
          <Animated.View style={[styles.logoWrap, logoStyle]}>
            <Image source={LOGO} style={styles.logo} resizeMode="cover" />
          </Animated.View>
        </View>

        <Animated.Text style={[styles.title, titleStyle]}>Artsy</Animated.Text>

        <Animated.View style={[styles.body, bodyStyle]}>
          <Text style={styles.subtitle}>
            Book verified artists for every occasion — weddings, events and
            more.
          </Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map(label => (
              <View key={label} style={styles.chip}>
                <Text style={styles.chipText}>{label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.proof}>500+ verified artists in Bangalore</Text>
        </Animated.View>

        <View style={styles.spacer} />

        <Animated.View style={[styles.ctaWrap, ctaStyle]}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.88}>
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
          <Text style={styles.footer}>
            Trusted by 10,000+ event organisers
          </Text>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
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
    marginTop: 48,
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
  body: {
    width: '100%',
    alignItems: 'center',
  },
  subtitle: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.88)',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 20,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginHorizontal: 3,
    marginBottom: 6,
  },
  chipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  proof: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    fontWeight: '600',
  },
  spacer: {
    flex: 1,
  },
  ctaWrap: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 8,
  },
  button: {
    width: width - 56,
    height: 52,
    backgroundColor: '#fff',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#7157FF',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    marginTop: 10,
    marginBottom: 12,
    color: 'rgba(255,255,255,0.62)',
    fontSize: 12,
    fontWeight: '500',
  },
});
