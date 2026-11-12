import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { customToast } from '../utils/toast';

export default function DigilockerCallbackScreen({ navigation, route }) {
  const status = route.params?.status || 'denied';
  const message = route.params?.message;

  useEffect(() => {
    if (status === 'success') {
      navigation.replace('VerifySelfie', { role: route.params?.role });
      return;
    }
    customToast(
      message || 'DigiLocker access was not completed. Please try again.',
      'error',
    );
    navigation.replace('DigilockerInstructions');
  }, [status, message, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.text}>Completing DigiLocker verification...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  text: { marginTop: 12, color: '#6B7280', fontWeight: '600', textAlign: 'center' },
});
