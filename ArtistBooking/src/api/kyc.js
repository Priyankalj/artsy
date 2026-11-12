import { API_BASE_URL } from '../config/api';
import { ApiError, apiRequest, getAuthToken } from './client';

export function fetchKycStatusApi() {
  return apiRequest('/kyc/status');
}

export function initDigilockerApi() {
  return apiRequest('/kyc/digilocker/init', { method: 'POST', body: {} });
}

export async function verifySelfieApi(localUri) {
  const token = getAuthToken();
  if (!token) {
    throw new ApiError('Please sign in before verifying your selfie.');
  }
  if (!localUri) {
    throw new ApiError('Please take a selfie before verifying.');
  }

  const formData = new FormData();
  formData.append('file', {
    uri: localUri,
    type: 'image/jpeg',
    name: `selfie-${Date.now()}.jpg`,
  });

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/kyc/selfie`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
  } catch {
    throw new ApiError(
      'Unable to reach server. Check that the backend is running and your phone is on the same Wi‑Fi.',
    );
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.success === false) {
    throw new ApiError(payload?.message || 'Unable to verify your photo.', {
      status: response.status,
      payload,
    });
  }

  return payload;
}
