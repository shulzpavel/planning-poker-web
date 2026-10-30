const point = (radius: number, turn: number) => {
  const angle = turn * Math.PI * 2 - Math.PI / 2;
  return `${Number((105 + radius * Math.cos(angle)).toFixed(6))} ${Number((105 + radius * Math.sin(angle)).toFixed(6))}`;
};

/** Filled annular sectors keep shared radial edges straight, including the 0/360° seam. */
export function donutSlicePath(start: number, share: number): string {
  if (!Number.isFinite(start) || !Number.isFinite(share) || share <= 0) return "";
  const size = Math.min(1, share), steps = Math.ceil(size * 2), end = start + size;
  const outer = Array.from({ length: steps }, (_, i) => `A 89 89 0 0 1 ${point(89, start + size * (i + 1) / steps)}`);
  const inner = Array.from({ length: steps }, (_, i) => `A 67 67 0 0 0 ${point(67, end - size * (i + 1) / steps)}`);
  return `M ${point(89, start)} ${outer.join(" ")} L ${point(67, end)} ${inner.join(" ")} Z`;
}
