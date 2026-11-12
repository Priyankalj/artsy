import { useEffect, useRef } from 'react';
import { CommonActions } from '@react-navigation/native';
import {
  listenForForegroundMessages,
  listenForNotificationOpens,
  listenForPushTokenRefresh,
  registerPushToken,
} from './push';

export default function usePushNotifications(navigationRef, isLoggedIn) {
  const pendingOpen = useRef(null);

  useEffect(() => {
    if (!isLoggedIn) {
      return undefined;
    }

    registerPushToken();
    const unsubRefresh = listenForPushTokenRefresh();
    const unsubForeground = listenForForegroundMessages();

    const openFromData = data => {
      if (!data) {
        return;
      }
      const nav = navigationRef?.current;
      if (!nav) {
        pendingOpen.current = data;
        return;
      }
      try {
        nav.dispatch(
          CommonActions.navigate({
            name: 'Bookings',
            params: { bookingId: data.booking_id },
          }),
        );
      } catch {
        // Auth stack may not have Bookings yet
      }
    };

    const unsubOpens = listenForNotificationOpens(openFromData);

    if (pendingOpen.current && navigationRef?.current) {
      openFromData(pendingOpen.current);
      pendingOpen.current = null;
    }

    return () => {
      unsubRefresh();
      unsubForeground();
      unsubOpens();
    };
  }, [isLoggedIn, navigationRef]);
}
