import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {colors} from '../theme/colors';

export default function OnboardingProgressHeader({
  steps = [],
  currentIndex = 0,
}) {
  if (!steps.length) {
    return null;
  }

  const safeIndex = Math.min(Math.max(currentIndex, 0), steps.length - 1);

  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressRow}>
        {steps.map((label, index) => (
          <View
            key={label}
            style={[
              styles.progressBar,
              index < safeIndex && styles.progressBarDone,
              index === safeIndex && styles.progressBarActive,
            ]}
          />
        ))}
      </View>
      <View style={styles.stepMeta}>
        <Text style={styles.stepLabel}>
          Step {safeIndex + 1} of {steps.length}
        </Text>
        <Text style={styles.stepName}>{steps[safeIndex]}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progressWrap: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
  },
  progressBarDone: {
    backgroundColor: colors.primary,
  },
  progressBarActive: {
    backgroundColor: '#8B5CF6',
  },
  stepMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  stepLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  stepName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
});
