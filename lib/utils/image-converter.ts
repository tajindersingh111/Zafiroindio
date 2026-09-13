/**
 * Client-Side WebP Image Converter Utility
 * Converts any Image File (PNG, JPG, JPEG, GIF, BMP, SVG) to WebP format in the browser.
 */

export interface ConvertedWebPResult {
  file: File;
  dataUrl: string;
  originalSize: number;
  webpSize: number;
  savingsPercent: number;
}

export function convertImageToWebP(
  file: File,
  quality = 0.85
): Promise<ConvertedWebPResult> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Selected file is not a valid image."));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas 2D context not supported."));
          return;
        }

        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to convert image to WebP blob."));
              return;
            }

            const cleanName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
            const webpFile = new File([blob], cleanName, { type: "image/webp" });
            const dataUrl = canvas.toDataURL("image/webp", quality);

            const originalSize = file.size;
            const webpSize = blob.size;
            const savingsPercent = originalSize > 0
              ? Math.round(((originalSize - webpSize) / originalSize) * 100)
              : 0;

            resolve({
              file: webpFile,
              dataUrl,
              originalSize,
              webpSize,
              savingsPercent
            });
          },
          "image/webp",
          quality
        );
      };

      img.onerror = () => reject(new Error("Failed to load image file for WebP conversion."));
      img.src = event.target?.result as string;
    };

    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}
