export function redirectToSignIn(next?: string) {
  if (typeof window === 'undefined') return;

  const url = `/login${next ? `?next=${encodeURIComponent(next)}` : ''}`;
  window.location.href = url;
}
