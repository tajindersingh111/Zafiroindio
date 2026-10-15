/** Return / exchange rules shared by the policy page, the request form and the API (client-safe). */
export const RETURN_WINDOW_DAYS = 7;

/** Opening (unboxing) video limits. Stored in Postgres in chunks, so keep it bounded. */
export const VIDEO_MAX_MB = 100;
export const VIDEO_MAX_BYTES = VIDEO_MAX_MB * 1024 * 1024;
/** Upload piece size: well under any proxy body limit. */
export const VIDEO_CHUNK_BYTES = 4 * 1024 * 1024;

export type ReturnKind = "return" | "exchange";

export const RETURN_KIND_LABEL: Record<ReturnKind, string> = {
  return: "Return (product arrived damaged)",
  exchange: "Exchange (size, colour, design or anything else)",
};
