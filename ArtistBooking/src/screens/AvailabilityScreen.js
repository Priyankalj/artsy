import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { fetchMyArtistProfileApi, updateAvailabilityApi } from '../api/artists';
import { colors } from '../theme/colors';
import { customToast } from '../utils/toast';
import {
  WEEK_DAYS,
  TIME_SLOTS,
  mergeAvailability,
  formatSlot,
  summarizeDay,
} from '../constants/availability';

export default function AvailabilityScreen({ navigation }) {
  const [hours, setHours] = useState(mergeAvailability());
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchMyArtistProfileApi();
      setHours(mergeAvailability(result?.data?.artist?.availability));
    } catch (err) {
      customToast(err.message || 'Could not load availability', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const updateDay = (id, patch) => {
    setHours(prev => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  };

  const copyWeekdays = () => {
    const source = hours.mon;
    setHours(prev => {
      const next = { ...prev };
      ['tue', 'wed', 'thu', 'fri'].forEach(id => {
        next[id] = { ...source };
      });
      return next;
    });
    customToast('Weekday hours copied from Monday', 'success');
  };

  const invalidDay = WEEK_DAYS.find(({ id }) => {
    const day = hours[id];
    return day.enabled && day.start >= day.end;
  });

  const save = async () => {
    if (invalidDay) {
      customToast('End time must be after start time', 'error');
      return;
    }
    setSaving(true);
    try {
      await updateAvailabilityApi(hours);
      customToast('Availability updated', 'success');
      navigation.goBack();
    } catch (err) {
      customToast(err.message || 'Could not save availability', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.top}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.topText}>
          <Text style={styles.title}>Availability</Text>
          <Text style={styles.sub}>Hours customers can book you</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={styles.copyBtn} onPress={copyWeekdays}>
              <Text style={styles.copyText}>Copy Monday hours to weekdays</Text>
            </TouchableOpacity>

            {WEEK_DAYS.map(({ id, label }) => {
              const day = hours[id];
              const open = expanded === id;
              const invalid = day.enabled && day.start >= day.end;
              return (
                <View key={id} style={styles.card}>
                  <View style={styles.dayRow}>
                    <TouchableOpacity
                      style={styles.dayMeta}
                      onPress={() => setExpanded(open ? null : id)}>
                      <Text style={styles.dayLabel}>{label}</Text>
                      <Text style={[styles.dayHours, invalid && styles.dayHoursBad]}>
                        {summarizeDay(day)}
                      </Text>
                    </TouchableOpacity>
                    <Switch
                      value={day.enabled}
                      onValueChange={enabled => {
                        updateDay(id, { enabled });
                        if (enabled) setExpanded(id);
                      }}
                      trackColor={{ false: '#E5E7EB', true: '#C4B5FD' }}
                      thumbColor={day.enabled ? colors.primary : '#F9FAFB'}
                    />
                  </View>

                  {open && day.enabled ? (
                    <View style={styles.editor}>
                      <TimePicker
                        label="Starts"
                        value={day.start}
                        onChange={start => updateDay(id, { start })}
                      />
                      <TimePicker
                        label="Ends"
                        value={day.end}
                        onChange={end => updateDay(id, { end })}
                      />
                      {invalid ? (
                        <Text style={styles.invalid}>
                          End time must be after start time
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveDisabled]}
              onPress={save}
              disabled={saving}>
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.saveText}>Save hours</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function TimePicker({ label, value, onChange }) {
  return (
    <View style={styles.pickerBlock}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <View style={styles.timeGrid}>
        {TIME_SLOTS.map(slot => {
          const active = slot === value;
          return (
            <TouchableOpacity
              key={slot}
              style={[styles.timeChip, active && styles.timeChipActive]}
              onPress={() => onChange(slot)}>
              <Text style={[styles.timeText, active && styles.timeTextActive]}>
                {formatSlot(slot)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 18, fontWeight: '700', color: '#111827' },
  topText: { flex: 1 },
  title: { fontSize: 20, fontWeight: '900', color: '#111827' },
  sub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  loader: { marginTop: 40 },
  content: { padding: 16, paddingBottom: 120 },
  copyBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  copyText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 14,
    marginBottom: 10,
  },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayMeta: { flex: 1 },
  dayLabel: { fontSize: 15, fontWeight: '800', color: '#111827' },
  dayHours: { fontSize: 12, color: '#6B7280', marginTop: 2, fontWeight: '600' },
  dayHoursBad: { color: '#DC2626' },
  editor: { marginTop: 12, gap: 12 },
  pickerBlock: { gap: 8 },
  pickerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  timeChip: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  timeChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#F5F3FF',
  },
  timeText: { fontSize: 12, fontWeight: '700', color: '#374151' },
  timeTextActive: { color: colors.primary },
  invalid: { color: '#DC2626', fontSize: 12, fontWeight: '600' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingBottom: 28,
    backgroundColor: '#FAFAFA',
  },
  saveBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDisabled: { opacity: 0.45 },
  saveText: { color: colors.white, fontWeight: '900', fontSize: 15 },
});
