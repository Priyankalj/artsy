import { apiRequest } from './client';

export async function fetchArtistsApi(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  });
  const qs = query.toString();
  return apiRequest(`/artists${qs ? `?${qs}` : ''}`);
}

export async function fetchArtistByIdApi(id) {
  return apiRequest(`/artists/${id}`);
}

export async function fetchArtistGalleryApi(id) {
  return apiRequest(`/artists/${id}/gallery`);
}

export async function fetchCategoriesApi() {
  return apiRequest('/artists/categories');
}

export async function fetchMyArtistProfileApi() {
  return apiRequest('/artists/me');
}

export async function fetchEarningsApi() {
  return apiRequest('/artists/earnings');
}

export async function updateAvailabilityApi(availability) {
  return apiRequest('/artists/me/availability', {
    method: 'PATCH',
    body: { availability },
  });
}

export async function saveBankAccountApi({
  accountNumber,
  confirmAccountNumber,
  ifsc,
  accountName,
}) {
  return apiRequest('/artists/me/bank', {
    method: 'POST',
    body: {
      accountNumber,
      confirmAccountNumber,
      ifsc,
      accountName,
    },
  });
}
