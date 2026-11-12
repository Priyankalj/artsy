import { apiRequest } from './client';

export async function registerDeviceTokenApi(token, platform) {
  return apiRequest('/users/me/device-token', {
    method: 'POST',
    body: { token, platform },
    silent: true,
  });
}

export async function unregisterDeviceTokenApi(token) {
  return apiRequest('/users/me/device-token', {
    method: 'DELETE',
    body: token ? { token } : {},
    silent: true,
  });
}
