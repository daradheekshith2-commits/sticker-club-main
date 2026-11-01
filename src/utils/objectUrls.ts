/**
 * TEMPORARY FILE URLS (blob:...) with reference counting.
 *
 * An uploaded photo can be shown in the builder AND in a cart line at the
 * same time. Each place that shows it "retains" the URL and "releases" it when
 * done; the browser memory is freed (revokeObjectURL) only when nobody uses it.
 *
 * These URLs only live as long as the browser tab. They cannot survive a
 * page refresh, and nothing here is ever uploaded anywhere.
 */

export interface ObjectUrlRegistry {
  create(blob: Blob): string;
  retain(url: string): void;
  release(url: string): void;
  count(url: string): number;
}

export function createObjectUrlRegistry(
  make: (blob: Blob) => string = (b) => URL.createObjectURL(b),
  revoke: (url: string) => void = (u) => URL.revokeObjectURL(u),
): ObjectUrlRegistry {
  const counts = new Map<string, number>();
  return {
    /** Makes a URL for a file; the caller holds the first reference. */
    create(blob) {
      const url = make(blob);
      counts.set(url, 1);
      return url;
    },
    retain(url) {
      if (counts.has(url)) counts.set(url, counts.get(url)! + 1);
    },
    release(url) {
      const n = counts.get(url);
      if (n === undefined) return;
      if (n <= 1) {
        counts.delete(url);
        revoke(url);
      } else counts.set(url, n - 1);
    },
    count: (url) => counts.get(url) ?? 0,
  };
}

/** The app-wide registry. */
export const objectUrls = createObjectUrlRegistry();
