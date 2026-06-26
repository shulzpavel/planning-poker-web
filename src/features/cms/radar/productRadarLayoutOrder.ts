import { arrayMove } from "@dnd-kit/sortable";

export const PRODUCT_RADAR_LAYOUT_BLOCK_KEYS = ["analytics", "insights", "jql"] as const;

export type ProductRadarLayoutBlockKey = (typeof PRODUCT_RADAR_LAYOUT_BLOCK_KEYS)[number];

export const DEFAULT_PRODUCT_RADAR_LAYOUT_ORDER: ProductRadarLayoutBlockKey[] = [
  ...PRODUCT_RADAR_LAYOUT_BLOCK_KEYS,
];

const STORAGE_PREFIX = "product-radar-layout-order:";

export function isProductRadarLayoutBlockKey(value: string): value is ProductRadarLayoutBlockKey {
  return (PRODUCT_RADAR_LAYOUT_BLOCK_KEYS as readonly string[]).includes(value);
}

export function mergeProductRadarLayoutOrder(
  saved: string[] | null | undefined,
  visibleKeys?: ProductRadarLayoutBlockKey[],
): ProductRadarLayoutBlockKey[] {
  const known = new Set<string>(PRODUCT_RADAR_LAYOUT_BLOCK_KEYS);
  const result: ProductRadarLayoutBlockKey[] = [];
  const seen = new Set<string>();

  for (const key of saved ?? []) {
    if (typeof key !== "string" || !known.has(key) || seen.has(key)) continue;
    result.push(key as ProductRadarLayoutBlockKey);
    seen.add(key);
  }

  for (const key of DEFAULT_PRODUCT_RADAR_LAYOUT_ORDER) {
    if (!seen.has(key)) result.push(key);
  }

  if (!visibleKeys) return result;
  return result.filter((key) => visibleKeys.includes(key));
}

export function reorderProductRadarLayoutOrder(
  fullOrder: ProductRadarLayoutBlockKey[],
  visibleKeys: ProductRadarLayoutBlockKey[],
  activeId: string,
  overId: string,
): ProductRadarLayoutBlockKey[] {
  const visibleOrder = fullOrder.filter((key) => visibleKeys.includes(key));
  const oldIndex = visibleOrder.indexOf(activeId as ProductRadarLayoutBlockKey);
  const newIndex = visibleOrder.indexOf(overId as ProductRadarLayoutBlockKey);
  if (oldIndex < 0 || newIndex < 0) return fullOrder;

  const nextVisible = arrayMove(visibleOrder, oldIndex, newIndex);
  let visibleIndex = 0;
  return fullOrder.map((key) => (visibleKeys.includes(key) ? nextVisible[visibleIndex++]! : key));
}

export function readProductRadarLayoutOrder(radarId: number): ProductRadarLayoutBlockKey[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${radarId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return mergeProductRadarLayoutOrder(parsed);
  } catch {
    return null;
  }
}

export function writeProductRadarLayoutOrder(radarId: number, order: ProductRadarLayoutBlockKey[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${radarId}`, JSON.stringify(order));
  } catch {
    // ignore quota / private mode
  }
}
