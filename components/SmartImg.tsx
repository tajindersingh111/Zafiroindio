"use client";

import { fallbackToOriginal, img, imgSrcSet, type ImgWidth } from "@/lib/img";

/**
 * <img> for remote photos in server components: serves a resized WebP copy and falls back to the
 * original file if the resize fails (e.g. the media server was slow on a cold cache).
 */
export default function SmartImg({ src, width, widths, sizes, ...rest }: Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "width"> & { src: string; width: ImgWidth; widths?: ImgWidth[] }) {
  return <img {...rest} src={img(src, width)} srcSet={widths ? imgSrcSet(src, widths) : undefined} sizes={sizes} onError={fallbackToOriginal(src)} decoding="async" />;
}
