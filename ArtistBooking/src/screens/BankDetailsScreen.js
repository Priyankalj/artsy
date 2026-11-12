import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { customToast } from '../utils/toast';
import { fetchOnboardingStatus } from '../auth/authService';
import { persistAuthSession, getAuthToken } from '../api/client';
import { saveBankAccountApi } from '../api/artists';
import {
  ARTIST_FLOW_STEPS,
  bankStepIndex,
} from '../constants/onboarding';
import OnboardingProgressHeader from '../components/OnboardingProgressHeader';

const SUCCESS_DELAY_MS = 1200;

export default function BankDetailsScreen({ navigation, onAuthenticated }) {
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [loading, setLoading] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const [modalState, setModalState] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const me = await fetchOnboardingStatus();
      if (cancelled) return;
      if (me.success) {
        setAccountName(
          me.user?.aadhaar_name || me.user?.name || '',
        );
      } else if (me.error) {
        customToast(me.error, 'error');
      }
      setHydrating(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const canSubmit =
    accountNumber.length >= 9 &&
    confirmAccountNumber === accountNumber &&
    ifsc.length === 11 &&
    accountName.trim().length >= 2;

  const finish = async user => {
    await persistAuthSession({ token: getAuthToken(), user });
    onAuthenticated?.({
      isAuthenticated: true,
      token: getAuthToken(),
      user,
    });
  };

  const handleSave = async () => {
    if (loading) return;
    if (confirmAccountNumber !== accountNumber) {
      customToast('Account numbers do not match', 'error');
      return;
    }
    if (!canSubmit) {
      customToast('Enter a valid account number and IFSC', 'error');
      return;
    }

    setLoading(true);
    setModalState('verifying');
    try {
      const result = await saveBankAccountApi({
        accountNumber,
        confirmAccountNumber,
        ifsc,
        accountName: accountName.trim(),
      });
      setModalState('success');
      setTimeout(() => {
        finish(result?.data?.user);
      }, SUCCESS_DELAY_MS);
    } catch (error) {
      setModalState(null);
      customToast(
        error.message || 'Could not verify this bank account',
        'error',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <OnboardingProgressHeader
        steps={ARTIST_FLOW_STEPS}
        currentIndex={bankStepIndex()}
      />
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.navigate('OnboardingStatus')}
          hitSlop={12}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Bank account</Text>
        <View style={styles.backSpacer} />
      </View>

      {hydrating ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled">
            <Text style={styles.heading}>Where should we send payouts?</Text>
            <Text style={styles.subtitle}>
              Use an account in your Aadhaar name. We verify it before you can
              take paid bookings.
            </Text>

            <Text style={styles.label}>Account holder name</Text>
            <TextInput
              value={accountName}
              editable={false}
              style={[styles.input, styles.inputLocked]}
            />
            <Text style={styles.hint}>Locked to your Aadhaar name</Text>

            <Text style={styles.label}>Account number</Text>
            <TextInput
              value={accountNumber}
              onChangeText={value =>
                setAccountNumber(value.replace(/[^\d]/g, '').slice(0, 18))
              }
              keyboardType="number-pad"
              maxLength={18}
              placeholder="9–18 digit account number"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              editable={!loading}
            />

            <Text style={styles.label}>Confirm account number</Text>
            <TextInput
              value={confirmAccountNumber}
              onChangeText={value =>
                setConfirmAccountNumber(
                  value.replace(/[^\d]/g, '').slice(0, 18),
                )
              }
              keyboardType="number-pad"
              maxLength={18}
              placeholder="Re-enter account number"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              editable={!loading}
            />

            <Text style={styles.label}>IFSC</Text>
            <TextInput
              value={ifsc}
              onChangeText={value =>
                setIfsc(
                  value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, '')
                    .slice(0, 11),
                )
              }
              autoCapitalize="characters"
              maxLength={11}
              placeholder="HDFC0001234"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              editable={!loading}
            />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.cta, (!canSubmit || loading) && styles.ctaDisabled]}
              onPress={handleSave}
              disabled={!canSubmit || loading}>
              <Text
                style={[
                  styles.ctaText,
                  (!canSubmit || loading) && styles.ctaTextDisabled,
                ]}>
                {loading ? 'Verifying…' : 'Verify account'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      <Modal visible={modalState !== null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.statusCard}>
            {modalState === 'verifying' ? (
              <>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.statusTitle}>Verifying account</Text>
                <Text style={styles.statusSub}>
                  Matching this account to your verified name.
                </Text>
              </>
            ) : (
              <>
                <View style={styles.successIcon}>
                  <Check size={36} color="#16A34A" strokeWidth={2.5} />
                </View>
                <Text style={styles.statusTitle}>Account verified</Text>
                <Text style={styles.statusSub}>
                  Payouts will be sent to this bank account.
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  flex: { flex: 1 },
  loader: { marginTop: 40 },
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
    marginBottom: 22,
    fontSize: 14,
    lineHeight: 22,
    color: '#6B7280',
  },
  label: {
    marginTop: 14,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hint: { marginTop: 4, fontSize: 12, color: '#9CA3AF' },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  inputLocked: { backgroundColor: '#F3F4F6', color: '#6B7280' },
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
});
