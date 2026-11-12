import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';
import { registerToastHandler } from '../utils/toast';
import global from '../global';

/**
 * Floatr <Toasts /> pattern: overlay sibling, never in the navigator flex
 * tree. iOS uses FullWindowOverlay so native-stack screens cannot push the
 * toast into layout (that was shrinking the page and pinning it to the bottom).
 */
export default function ToastHost() {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
  const hideTimer = useRef(null);

  const hide = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -12,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => setToast(null));
  }, [opacity, translateY]);

  const show = useCallback(
    ({ message, type, duration = 6000 }) => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }

      setToast({ message, type });
      opacity.setValue(0);
      translateY.setValue(-12);

      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      });

      hideTimer.current = setTimeout(hide, duration);
    },
    [hide, opacity, translateY],
  );

  useEffect(() => {
    registerToastHandler(show);
    return () => {
      registerToastHandler(null);
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }
    };
  }, [show]);

  const isError = toast?.type !== 'success';

  const overlay = (
    <View
      pointerEvents="box-none"
      style={[
        Platform.OS === 'ios' ? styles.hostIos : styles.hostAndroid,
        { paddingTop: Math.max(insets.top, 12) + 8 },
      ]}>
      {toast ? (
        <Animated.View
          pointerEvents="auto"
          style={[
            styles.toast,
            {
              opacity,
              transform: [{ translateY }],
            },
          ]}>
          <TouchableOpacity activeOpacity={0.9} onPress={hide}>
            <Text
              style={[
                styles.text,
                {
                  color: isError
                    ? global.color.jasperRed
                    : global.color.treeGreen,
                },
              ]}>
              {toast.message}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      ) : null}
    </View>
  );

  if (Platform.OS === 'ios') {
    return <FullWindowOverlay>{overlay}</FullWindowOverlay>;
  }

  return overlay;
}

const styles = StyleSheet.create({
  hostIos: {
    flex: 1,
    alignItems: 'center',
  },
  hostAndroid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    elevation: 99999,
    alignItems: 'center',
  },
  toast: {
    width: '92%',
    backgroundColor: global.color.white,
    overflow: 'hidden',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  text: {
    fontFamily: global.font.font_family_fs,
    fontSize: global.fontsize.f16,
    textAlign: 'center',
    lineHeight: 22,
  },
});
