import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { customToast } from '../utils/toast';
import { fetchKycStatusApi, initDigilockerApi } from '../api/kyc';
import { ApiError } from '../api/client';
import { fetchOnboardingStatus } from '../auth/authService';
import {
  aadhaarStepIndex,
  flowStepsForRole,
} from '../constants/onboarding';
import OnboardingProgressHeader from '../components/OnboardingProgressHeader';

const STEP1_MOBILE = require('../assets/images/digilocker/step1-mobile.png');
const STEP1_AADHAAR = require('../assets/images/digilocker/step1-aadhaar.png');
const STEP2_DOCS = require('../assets/images/digilocker/step2-documents.png');
const STEP3_ALLOW = require('../assets/images/digilocker/step3-allow.png');

const INSTRUCTION_STEPS = [
  {
    id: 'login-mobile',
    number: '1',
    variant: 'primary',
    title: 'Login to DigiLocker',
    description: 'Login using your Aadhaar-linked mobile number',
    image: STEP1_MOBILE,
    imageAlt: 'DigiLocker mobile login screen',
    highlights: [],
  },
  {
    id: 'login-aadhaar',
    number: '1',
    variant: 'muted',
    title: 'Not able to login with mobile?',
    description: "Select 'Others' and login using your Aadhaar number",
    image: STEP1_AADHAAR,
    imageAlt: 'DigiLocker Aadhaar login screen',
    highlights: ["'Others'"],
  },
  {
    id: 'select-docs',
    number: '2',
    variant: 'primary',
    title: 'Select your documents',
    description:
      'After logging in, select Aadhaar from the list. If available, also select PAN',
    image: STEP2_DOCS,
    imageAlt: 'DigiLocker document selection screen',
    highlights: ['Aadhaar', 'PAN'],
  },
  {
    id: 'allow-access',
    number: '3',
    variant: 'primary',
    title: 'Allow Access',
    description: "Click 'Allow' to give and complete your Aadhaar verification",
    image: STEP3_ALLOW,
    imageAlt: 'DigiLocker allow access screen',
    highlights: ["'Allow'"],
  },
];

function HighlightText({ text, highlights = [] }) {
  if (!highlights.length) {
    return <Text>{text}</Text>;
  }
  const pattern = new RegExp(
    `(${highlights
      .map(item => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|')})`,
    'g',
  );
  const parts = String(text).split(pattern);
  return (
    <Text>
      {parts.map((part, index) =>
        highlights.includes(part) ? (
          <Text key={`${part}-${index}`} style={styles.highlight}>
            {part}
          </Text>
        ) : (
          <Text key={`${part}-${index}`}>{part}</Text>
        ),
      )}
    </Text>
  );
}

function parseDigilockerUrl(url) {
  if (!url || !String(url).includes('kyc/digilocker')) {
    return null;
  }
  try {
    const parsed = new URL(url.replace('artsy://', 'https://artsy.app/'));
    return {
      status: parsed.searchParams.get('status') || 'denied',
      message: parsed.searchParams.get('message') || '',
    };
  } catch {
    return { status: 'denied', message: '' };
  }
}

export default function DigilockerInstructionsScreen({ navigation, route }) {
  const [checking, setChecking] = useState(true);
  const [starting, setStarting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [role, setRole] = useState(route.params?.role || null);
  const startingRef = useRef(false);
  const flowSteps = flowStepsForRole(role);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [result, me] = await Promise.all([
          fetchKycStatusApi().catch(() => null),
          fetchOnboardingStatus(),
        ]);
        if (cancelled) {
          return;
        }
        if (me?.user?.role) {
          setRole(me.user.role);
        }
        if (result?.data?.selfieVerified) {
          const pending = me?.onboarding?.current_step;
          if (pending === 'bank') {
            navigation.replace('BankDetails', {
              role: me?.user?.role || role,
            });
            return;
          }
          navigation.replace('OnboardingStatus');
          return;
        }
        if (result?.data?.digilockerVerified) {
          navigation.replace('VerifySelfie', {
            role: me?.user?.role || role,
          });
        }
      } catch {
        // stay on instructions
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigation]);

  useEffect(() => {
    const handleUrl = ({ url }) => {
      const result = parseDigilockerUrl(url);
      if (!result) {
        return;
      }
      if (result.status === 'success') {
        navigation.replace('VerifySelfie', { role });
        return;
      }
      customToast(
        result.message ||
          'DigiLocker access was not completed. Please try again.',
        'error',
      );
    };

    const sub = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then(url => {
      if (url) {
        handleUrl({ url });
      }
    });
    return () => sub.remove();
  }, [navigation, role]);

  const handleContinue = async () => {
    if (startingRef.current) {
      return;
    }
    startingRef.current = true;
    setStarting(true);
    try {
      const res = await initDigilockerApi();
      const data = res?.data || {};
      if (data.already_verified || data.bypass || data.digilockerVerified) {
        navigation.replace('VerifySelfie', { role });
        return;
      }
      if (data.authorization_url) {
        await Linking.openURL(data.authorization_url);
        return;
      }
      customToast(
        res?.message || 'Unable to start DigiLocker. Please try again.',
        'error',
      );
    } catch (error) {
      if (!(error instanceof ApiError)) {
        customToast('Unable to start DigiLocker. Please try again.', 'error');
      }
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  };

  if (checking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>
            Checking verification status...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.navigate('OnboardingStatus')}
          hitSlop={12}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Aadhaar Verification</Text>
        <View style={styles.backSpacer} />
      </View>

      <OnboardingProgressHeader
        steps={flowSteps}
        currentIndex={aadhaarStepIndex(role)}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>DigiLocker Instructions</Text>
        <Text style={styles.subtitle}>
          Follow these simple steps to complete your Aadhaar verification
        </Text>

        {INSTRUCTION_STEPS.map(step => (
          <View key={step.id}>
            <View style={styles.stepRow}>
              <View style={styles.stepCopy}>
                <View
                  style={[
                    styles.badge,
                    step.variant === 'muted' && styles.badgeMuted,
                  ]}>
                  <Text style={styles.badgeText}>{step.number}</Text>
                </View>
                <View style={styles.stepText}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>
                    <HighlightText
                      text={step.description}
                      highlights={step.highlights}
                    />
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() =>
                  setPreview({ src: step.image, alt: step.imageAlt })
                }
                activeOpacity={0.85}>
                <Image source={step.image} style={styles.stepImage} />
              </TouchableOpacity>
            </View>
            <View style={styles.divider} />
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.cta, starting && styles.ctaDisabled]}
          onPress={handleContinue}
          disabled={starting}>
          {starting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.ctaText}>Continue to Digilocker</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={Boolean(preview)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreview(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setPreview(null)}>
              <X size={18} color={colors.textDark} />
            </TouchableOpacity>
            {preview ? (
              <Image
                source={preview.src}
                style={styles.previewImage}
                resizeMode="contain"
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: '#6B7280', fontWeight: '600' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  back: { fontSize: 22, color: colors.textDark, width: 28 },
  backSpacer: { width: 28 },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: colors.textDark,
  },
  content: { paddingHorizontal: 20, paddingBottom: 28 },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textDark,
    textAlign: 'center',
    marginTop: 8,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 22,
    color: '#6B7280',
    textAlign: 'center',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 16,
    gap: 10,
  },
  stepCopy: { flex: 1, flexDirection: 'row', gap: 10 },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeMuted: { backgroundColor: '#9CA3AF' },
  badgeText: { color: colors.white, fontWeight: '800' },
  stepText: { flex: 1, paddingRight: 4 },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 4,
  },
  stepDesc: { fontSize: 12, lineHeight: 18, color: '#333333' },
  highlight: { color: colors.primary, fontWeight: '600' },
  stepImage: { width: 118, height: 118, borderRadius: 12 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginTop: 16 },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: colors.white,
  },
  cta: {
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.7 },
  ctaText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
  },
  modalClose: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: { width: '100%', height: 420, marginTop: 8 },
});
