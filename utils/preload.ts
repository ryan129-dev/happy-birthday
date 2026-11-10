// Match Emscripten's request modes so it reuses these downloads from the
// document's preload cache, even while the model is still being downloaded.
export function preloadResource(href: string, as: 'script' | 'fetch'): void {
  const url = new URL(href, document.baseURI).href;
  const existing = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="preload"]'));
  if (existing.some(link => link.href === url && link.as === as)) return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = url;
  link.as = as;
  link.crossOrigin = 'anonymous';
  link.addEventListener('error', () => link.remove(), { once: true });
  document.head.append(link);
}
