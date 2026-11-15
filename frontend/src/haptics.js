export function vibrate(pattern = 15) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore unsupported / blocked vibration calls */
    }
  }
}
