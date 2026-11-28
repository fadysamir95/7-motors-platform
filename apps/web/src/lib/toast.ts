export type ToastInput = { message: string; href?: string; actionLabel?: string; tone?: 'success' | 'error' };

export const TOAST_EVENT = 'app:toast';

/** Shows a short message at the bottom of the screen (rendered by components/ToastHost.tsx). */
export function showToast(toast: ToastInput) {
  window.dispatchEvent(new CustomEvent<ToastInput>(TOAST_EVENT, { detail: toast }));
}
