/** Format minutes into a human-readable duration for dashboard KPIs. */
export function formatProcessingTime(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) {
    return "—";
  }

  if (minutes < 1) {
    const seconds = Math.round(minutes * 60);
    return seconds <= 1 ? "< 1 sec" : `${seconds} sec`;
  }

  if (minutes < 60) {
    return `${minutes < 10 ? minutes.toFixed(1) : Math.round(minutes)} min`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}
