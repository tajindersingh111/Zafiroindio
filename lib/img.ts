/**
 * Resized, WebP copies of remote product photos via Next's image optimizer, for plain <img> tags.
 * Hosts must be allowed in next.config.ts (images.remotePatterns); anything else is returned as-is.
 * Widths must be one of Next's default device/image sizes.
 */
const OPTIMIZABLE = /^https:\/\/((www\.)?zafiroindio\.com\/wp-content\/uploads\/|images\.unsplash\.com\/)/i;
export type ImgWidth = 128 | 256 | 384 | 640 | 750 | 828 | 1080 | 1200 | 1920;

export function img(src: string | undefined, width: ImgWidth): string {
  if (!src) return "";
  return OPTIMIZABLE.test(src) ? `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75` : src;
}

/** `srcSet` for responsive <img> (undefined when the source can't be optimised). */
export function imgSrcSet(src: string | undefined, widths: ImgWidth[]): string | undefined {
  if (!src || !OPTIMIZABLE.test(src)) return undefined;
  return widths.map((w) => `${img(src, w)} ${w}w`).join(", ");
}

/**
 * onError for an optimised <img>: if the resized copy can't be produced (e.g. the media server was
 * slow on a cold cache), show the original file instead of a broken image. Runs once; if the
 * original fails as well, `onGiveUp` lets the caller hide the image.
 */
export function fallbackToOriginal(original: string | undefined, onGiveUp?: () => void) {
  return (e: { currentTarget: HTMLImageElement }) => {
    const el = e.currentTarget;
    if (!original || el.dataset.fallback) {
      onGiveUp?.(); // the original is broken too
      return;
    }
    el.dataset.fallback = "1";
    el.removeAttribute("srcset");
    el.src = original;
  };
}
