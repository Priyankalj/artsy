import { NativeModules, Platform } from 'react-native';
import {
  ENV,
  SERVERURL,
  MANUAL_LAN_IP,
  API_PORT,
  isDev,
} from '../../config';

/**
 * Resolve the machine hosting Metro/API (DEV only).
 * - Physical device: same LAN IP Metro already uses
 * - Android emulator: 10.0.2.2 (or MANUAL_LAN_IP)
 * - iOS simulator: 127.0.0.1 when Metro is on localhost
 *
 * Update MANUAL_LAN_IP in config_dev.js when your Wi‑Fi IP changes
 * (`ipconfig getifaddr en0`).
 */
function getDevHost() {
  const scriptURL = NativeModules.SourceCode?.scriptURL || '';
  const match = scriptURL.match(/https?:\/\/([^/:]+)(?::\d+)?/);
  const host = match?.[1];

  const isLoopback =
    !host || host === 'localhost' || host === '127.0.0.1';

  if (!isLoopback) {
    if (host === '10.0.2.2') {
      return MANUAL_LAN_IP || '10.0.2.2';
    }
    return host;
  }

  if (Platform.OS === 'ios') {
    return MANUAL_LAN_IP || '127.0.0.1';
  }

  return MANUAL_LAN_IP || '10.0.2.2';
}

function resolveApiBaseUrl() {
  if (SERVERURL) {
    return SERVERURL.replace(/\/$/, '');
  }
  // PROD must set SERVERURL in config_prod.js
  if (!isDev) {
    console.warn(
      '[api] PROD SERVERURL is empty — set it in config_prod.js',
    );
  }
  return `http://${getDevHost()}:${API_PORT || 5050}/api`;
}

export const API_HOST = SERVERURL ? null : getDevHost();
export const API_PORT_RESOLVED = API_PORT;
export const API_BASE_URL = resolveApiBaseUrl();

if (__DEV__) {
  console.log(`[api] ENV=${ENV} API_BASE_URL=${API_BASE_URL}`);
}
