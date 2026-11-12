/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Push is parked on personal-team iOS. Never let a missing FCM native
// module crash startup under the splash screen.
try {
  const messaging = require('@react-native-firebase/messaging').default;
  messaging().setBackgroundMessageHandler(async () => {});
} catch (error) {
  if (__DEV__) {
    console.warn('[push] background handler skipped', error?.message);
  }
}

AppRegistry.registerComponent(appName, () => App);
