/**
 * Floatr-style toast API: customToast(message, 'error' | 'success').
 * Always rendered at the TOP via ToastHost overlay (ToastPosition.TOP).
 * Do not put toast UI inside screens — that resizes the page.
 */

let showToast = null;

export function registerToastHandler(handler) {
  showToast = handler;
}

export function customToast(message, type = 'error', duration = 6000) {
  if (!message || message === 'NOALERT') {
    return;
  }

  if (typeof showToast !== 'function') {
    if (__DEV__) {
      console.warn('[toast]', type, message);
    }
    return;
  }

  showToast({
    message: String(message),
    type: type === 'success' ? 'success' : 'error',
    duration,
  });
}
