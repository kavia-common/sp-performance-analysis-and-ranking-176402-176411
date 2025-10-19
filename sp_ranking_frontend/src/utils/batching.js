 // PUBLIC_INTERFACE
export function getBatches(items, size = 50) {
  /** Returns an array of arrays (chunks) of given size. */
  const res = [];
  for (let i = 0; i < items.length; i += size) {
    res.push(items.slice(i, i + size));
  }
  return res;
}

/** Small async sleep helper */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
