import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, Camera, Check, X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { customToast } from '../utils/toast';
import { openCamera } from '../utils/openCamera';
import { fetchKycStatusApi, verifySelfieApi } from '../api/kyc';
import { fetchOnboardingStatus } from '../auth/authService';
import { persistAuthSession, getAuthToken, ApiError } from '../api/client';
import {
  flowStepsForRole,
  selfieStepIndex,
} from '../constants/onboarding';
import OnboardingProgressHeader from '../components/OnboardingProgressHeader';

const TIPS = [
  { icon: '💡', text: 'Make sure your face is clearly visible' },
  { icon: '☀️', text: 'Take photo in good lighting' },
  { icon: '🚫', text: "Don't wear sunglasses or a mask" },
];

const SUCCESS_DELAY_MS = 1600;

export default function VerifySelfieScreen({
  navigation,
  route,
  onAuthenticated,
}) {
  const [checking, setChecking] = useState(true);
  const [selfieUri, setSelfieUri] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [rateLimitNotice, setRateLimitNotice] = useState('');
  const [role, setRole] = useState(route.params?.role || null);
  const flowSteps = flowStepsForRole(role);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [result, me] = await Promise.all([
          fetchKycStatusApi(),
          fetchOnboardingStatus(),
        ]);
        if (cancelled) {
          return;
        }
        if (me?.user?.role) {
          setRole(me.user.role);
        }
        if (result?.data?.selfieVerified) {
          if (me?.user?.role === 'artist' && !me.user?.is_onboarded) {
            navigation.replace('BankDetails', { role: 'artist' });
            return;
          }
          if (me?.success && me.user?.is_onboarded) {
            await persistAuthSession({
              token: getAuthToken(),
              user: me.user,
            });
            onAuthenticated?.({
              isAuthenticated: true,
              token: getAuthToken(),
              user: me.user,
              onboarding: me.onboarding,
            });
            return;
          }
        }
        if (!result?.data?.digilockerVerified) {
          navigation.replace('DigilockerInstructions', { role });
        }
      } catch {
        // stay on selfie if status fetch fails after DigiLocker
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigation, onAuthenticated]);

  useEffect(() => {
    const image = route.params?.imagedata;
    if (!image?.uri) {
      return;
    }
    setSelfieUri(image.uri);
    setRateLimitNotice('');
    navigation.setParams({ imagedata: undefined, doctype: undefined });
  }, [route.params?.imagedata, navigation]);

  const handleCapture = () => {
    openCamera(navigation, {
      frompage: 'VerifySelfie',
      doctype: 'photo',
    });
  };

  const finishOnboarding = async () => {
    const me = await fetchOnboardingStatus();
    if (!me.success) {
      navigation.replace('OnboardingStatus');
      return;
    }
    if (me.user?.role === 'artist' && !me.user?.is_onboarded) {
      navigation.replace('BankDetails', { role: 'artist' });
      return;
    }
    await persistAuthSession({ token: getAuthToken(), user: me.user });
    onAuthenticated?.({
      isAuthenticated: true,
      token: getAuthToken(),
      user: me.user,
      onboarding: me.onboarding,
    });
  };

  const handleVerify = async () => {
    if (loading) {
      return;
    }
    if (!selfieUri) {
      customToast('Please take a selfie before verifying.', 'error');
      return;
    }

    setLoading(true);
    setModalState('verifying');
    try {
      await verifySelfieApi(selfieUri);
      setModalState('success');
      setTimeout(() => {
        finishOnboarding();
      }, SUCCESS_DELAY_MS);
    } catch (error) {
      setModalState(null);
      const payload = error instanceof ApiError ? error.payload : null;
      const notice = String(payload?.data?.rateLimitNotice || '').trim();
      if (notice) {
        setRateLimitNotice(notice);
      }
      const type = payload?.errorType;
      if (type === 'FACE_MISMATCH' || error?.message?.includes('does not match')) {
        customToast('Your selfie does not match your Aadhaar photo.', 'error');
      } else if (type === 'AADHAAR_PHOTO_MISSING') {
        customToast(
          'Complete DigiLocker verification first so we can match your selfie with your Aadhaar photo.',
          'error',
        );
      } else {
        customToast(
          error?.message ||
            'Unable to verify your photo. Please retake your selfie and try again.',
          'error',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const progressHeader = (
    <>
      <OnboardingProgressHeader
        steps={flowSteps}
        currentIndex={selfieStepIndex(role)}
      />
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.navigate('OnboardingStatus')}
          hitSlop={12}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Verify Your Selfie</Text>
        <View style={styles.backSpacer} />
      </View>
    </>
  );

  if (checking) {
    return (
      <SafeAreaView style={styles.container}>
        {progressHeader}
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {progressHeader}

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Take a selfie</Text>
        <Text style={styles.subtitle}>
          Use your front camera. The photo will be matched with the photo in
          your Aadhaar.
        </Text>

        {TIPS.map(tip => (
          <View key={tip.text} style={styles.tipRow}>
            <Text style={styles.tipIcon}>{tip.icon}</Text>
            <Text style={styles.tipText}>{tip.text}</Text>
          </View>
        ))}

        {!selfieUri ? (
          <View style={styles.previewBox}>
            <View style={styles.cameraCircle}>
              <Camera size={40} color="rgba(255,255,255,0.7)" />
            </View>
          </View>
        ) : (
          <View style={styles.previewBox}>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => setSelfieUri('')}>
              <X size={16} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.previewHit}
              onPress={() => setShowPreview(true)}>
              <Image source={{ uri: selfieUri }} style={styles.preview} />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.cameraBtn} onPress={handleCapture}>
          <Camera size={16} color={colors.primary} />
          <Text style={styles.cameraBtnText}>
            {selfieUri ? 'Retake Photo' : 'Open Camera'}
          </Text>
        </TouchableOpacity>

        {rateLimitNotice ? (
          <View style={styles.notice}>
            <AlertTriangle size={16} color="#EF4444" />
            <Text style={styles.noticeText}>{rateLimitNotice}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.cta, (!selfieUri || loading) && styles.ctaDisabled]}
          onPress={handleVerify}
          disabled={!selfieUri || loading}>
          <Text
            style={[
              styles.ctaText,
              (!selfieUri || loading) && styles.ctaTextDisabled,
            ]}>
            {loading ? 'Verifying...' : 'Verify Now'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalState !== null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.statusCard}>
            {modalState === 'verifying' ? (
              <>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.statusTitle}>Verifying your photo</Text>
                <Text style={styles.statusSub}>
                  Matching your selfie with your Aadhaar photo.
                </Text>
              </>
            ) : (
              <>
                <View style={styles.successIcon}>
                  <Check size={36} color="#16A34A" strokeWidth={2.5} />
                </View>
                <Text style={styles.statusTitle}>Photo Verified!</Text>
                <Text style={styles.statusSub}>
                  Your selfie has been matched successfully.
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPreview && !!selfieUri}
        transparent
        onRequestClose={() => setShowPreview(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.previewModal}
            onPress={() => setShowPreview(false)}>
            <Image
              source={{ uri: selfieUri }}
              style={styles.fullPreview}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textDark,
    marginTop: 8,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 18,
    fontSize: 14,
    lineHeight: 22,
    color: '#6B7280',
  },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  tipIcon: { width: 22, textAlign: 'center' },
  tipText: { fontSize: 12, color: '#6B7280', flex: 1 },
  previewBox: {
    marginTop: 8,
    alignSelf: 'center',
    width: 280,
    height: 280,
    borderRadius: 28,
    backgroundColor: '#4B5563',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewHit: { width: '100%', height: '100%' },
  preview: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBtn: {
    marginTop: 16,
    alignSelf: 'center',
    width: 280,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cameraBtnText: { color: colors.primary, fontWeight: '800' },
  notice: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    backgroundColor: '#FEF2F2',
    padding: 12,
    flexDirection: 'row',
    gap: 8,
  },
  noticeText: { flex: 1, color: '#B91C1C', fontSize: 13, lineHeight: 18 },
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
  ctaDisabled: { backgroundColor: '#E5E7EB' },
  ctaText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  ctaTextDisabled: { color: '#9CA3AF' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 28,
  },
  statusCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  statusTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '800',
    color: colors.textDark,
  },
  statusSub: {
    marginTop: 8,
    textAlign: 'center',
    color: '#6B7280',
    lineHeight: 20,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(22,163,74,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewModal: { flex: 1, justifyContent: 'center' },
  fullPreview: { width: '100%', height: '80%' },
});
