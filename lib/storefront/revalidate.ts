import { revalidatePath } from "next/cache";
import { invalidate } from "@/lib/cache";

/** Collections whose content is shown on the storefront. */
const STOREFRONT = new Set(["products", "reviews", "collections", "banners", "categories"]);

/**
 * Called after an admin rewrites a collection: storefront data on this server is reloaded on the next
 * visit and every cached (ISR) page is rebuilt in the background, so edits go live within seconds.
 */
export function storefrontChanged(collection: string): void {
  if (!STOREFRONT.has(collection)) return;
  invalidate("catalog:");
  try {
    revalidatePath("/", "layout");
  } catch {
    // Outside a request (CLI scripts): there is no page cache to clear.
  }
}
