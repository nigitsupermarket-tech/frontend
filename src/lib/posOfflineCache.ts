// frontend/src/lib/posOfflineCache.ts
//
// Offline-first product cache for the POS terminal, backed by IndexedDB.
//
// WHY THIS EXISTS
// ────────────────
// Every barcode scan and product search used to hit the network
// (`GET /products?barcode=`, `GET /pos/scale-barcode/:code`,
// `GET /products?search=`). On a slow or intermittently-dropping
// connection that means the cashier pulls the trigger, nothing happens
// for several seconds (up to the 30s axios timeout), and the queue
// behind the till backs up. That's the "scanner doesn't work" complaint.
//
// The fix: pull the ENTIRE sellable catalog into IndexedDB once, keep it
// fresh with small delta syncs, and resolve every scan/search against
// that local copy — synchronous from the cashier's point of view, and
// unaffected by the shop's wifi having a bad afternoon. The network is
// only ever in the loop for background syncing, never for the
// scan-to-cart path itself.
//
// This only covers LOOKUP (what is this barcode, what does it cost, is
// it in stock as of the last sync). It does NOT queue sales made while
// fully offline — finishing a sale still needs the backend (stock
// deduction has to be atomic across every till in the shop, and
// card/transfer payments need a live connection regardless). If you
// want offline checkout too, that's a separate, considerably bigger
// project — flag it back to Claude if/when you want to scope that.

import { apiGet } from "@/lib/api";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CachedVariation {
  id: string;
  label: string;
  quantity: number;
  price: number;
  compareAtPrice?: number | null;
  barcode?: string | null;
  stockQuantity?: number | null;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface CachedProduct {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  price: number;
  comparePrice?: number | null;
  stockQuantity: number;
  trackInventory: boolean;
  allowBackorder: boolean;
  lowStockThreshold: number;
  status: string;
  pendingDeleteRequest?: boolean | null;
  isScalable?: boolean;
  scaleUnit?: string | null;
  scaleStep?: number | null;
  scaleWareCode?: string | null;
  images: string[];
  updatedAt: string;
  variations: CachedVariation[];
}

interface CatalogResponse {
  data: {
    products: CachedProduct[];
    serverTime: string;
    mode: "full" | "delta";
    count: number;
  };
}

export type ScaleBarcodeError =
  | { reason: "no-code"; wareCode: string }
  | { reason: "not-scalable"; wareCode: string; name: string }
  | { reason: "not-active"; wareCode: string; name: string; status: string };

// ─── IndexedDB plumbing ─────────────────────────────────────────────────────

const DB_NAME = "calstins-pos-cache";
const DB_VERSION = 1;
const STORE_PRODUCTS = "products";
const STORE_BARCODES = "barcodeIndex"; // code -> { productId, variationId | null }
const STORE_META = "meta";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
        const store = db.createObjectStore(STORE_PRODUCTS, { keyPath: "id" });
        store.createIndex("scaleWareCode", "scaleWareCode", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_BARCODES)) {
        db.createObjectStore(STORE_BARCODES, { keyPath: "code" });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx<T>(
  storeNames: string[],
  mode: IDBTransactionMode,
  fn: (t: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeNames, mode);
    let result: T;
    Promise.resolve(fn(t))
      .then((r) => (result = r))
      .catch(reject);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ─── Meta (lastSyncedAt cursor) ─────────────────────────────────────────────

async function getMeta(key: string): Promise<string | null> {
  try {
    return await tx([STORE_META], "readonly", async (t) => {
      const row = await reqToPromise(
        t.objectStore(STORE_META).get(key) as IDBRequest<{ key: string; value: string } | undefined>,
      );
      return row?.value ?? null;
    });
  } catch {
    return null;
  }
}

async function setMeta(key: string, value: string): Promise<void> {
  await tx([STORE_META], "readwrite", (t) => {
    t.objectStore(STORE_META).put({ key, value });
  });
}

// ─── Upsert / evict ─────────────────────────────────────────────────────────

function isSellable(p: CachedProduct): boolean {
  return p.status === "ACTIVE" && !p.pendingDeleteRequest;
}

async function upsertProducts(products: CachedProduct[]): Promise<void> {
  if (products.length === 0) return;

  await tx([STORE_PRODUCTS, STORE_BARCODES], "readwrite", async (t) => {
    const productStore = t.objectStore(STORE_PRODUCTS);
    const barcodeStore = t.objectStore(STORE_BARCODES);

    for (const p of products) {
      // A delta sync can bring back a product that used to be sellable and
      // just went OUT_OF_STOCK/DRAFT/frozen — pull it (and its barcodes)
      // out of the cache entirely rather than let a stale copy keep
      // matching scans.
      if (!isSellable(p)) {
        productStore.delete(p.id);
        if (p.barcode) barcodeStore.delete(p.barcode);
        for (const v of p.variations || []) {
          if (v.barcode) barcodeStore.delete(v.barcode);
        }
        continue;
      }

      productStore.put(p);
      if (p.barcode) {
        barcodeStore.put({ code: p.barcode, productId: p.id, variationId: null });
      }
      for (const v of p.variations || []) {
        if (v.barcode && v.isActive) {
          barcodeStore.put({ code: v.barcode, productId: p.id, variationId: v.id });
        }
      }
    }
  });
}

// ─── Sync ───────────────────────────────────────────────────────────────────

export interface SyncResult {
  ok: boolean;
  offline?: boolean;
  count?: number;
  mode?: "full" | "delta";
  error?: string;
}

let syncInFlight: Promise<SyncResult> | null = null;

export async function syncCatalog(opts?: { force?: boolean }): Promise<SyncResult> {
  // Coalesce concurrent callers (mount + interval + online-event can all
  // fire close together) into a single in-flight request.
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    try {
      const lastSyncedAt = opts?.force ? null : await getMeta("lastSyncedAt");
      const url = lastSyncedAt
        ? `/pos/catalog?updatedSince=${encodeURIComponent(lastSyncedAt)}`
        : `/pos/catalog`;

      const res = await apiGet<CatalogResponse>(url);
      const { products, serverTime, mode, count } = res.data;

      await upsertProducts(products);
      await setMeta("lastSyncedAt", serverTime);

      return { ok: true, count, mode };
    } catch (err: any) {
      // Offline or the request timed out — not an error state worth
      // surfacing loudly, the cache just stays at whatever it last had.
      return { ok: false, offline: true, error: err?.message };
    } finally {
      syncInFlight = null;
    }
  })();

  return syncInFlight;
}

export async function getLastSyncedAt(): Promise<string | null> {
  return getMeta("lastSyncedAt");
}

export async function getCachedProductCount(): Promise<number> {
  try {
    return await tx([STORE_PRODUCTS], "readonly", (t) =>
      reqToPromise(t.objectStore(STORE_PRODUCTS).count()),
    );
  } catch {
    return 0;
  }
}

// ─── Lookups (instant, no network) ─────────────────────────────────────────

export interface LookupResult {
  product: CachedProduct;
  variation?: CachedVariation;
}

export async function lookupByBarcode(code: string): Promise<LookupResult | null> {
  try {
    return await tx([STORE_PRODUCTS, STORE_BARCODES], "readonly", async (t) => {
      const entry = await reqToPromise(
        t.objectStore(STORE_BARCODES).get(code) as IDBRequest<
          { code: string; productId: string; variationId: string | null } | undefined
        >,
      );
      if (!entry) return null;

      const product = await reqToPromise(
        t.objectStore(STORE_PRODUCTS).get(entry.productId) as IDBRequest<CachedProduct | undefined>,
      );
      if (!product) return null;

      const variation = entry.variationId
        ? product.variations.find((v) => v.id === entry.variationId)
        : undefined;

      return { product, variation };
    });
  } catch {
    return null;
  }
}

// Mirrors the backend's resolveScaleBarcode field layout exactly:
//   digits 0-6   scale "Code"  → Product.scaleWareCode
//   digits 7-11  net weight in grams
//   digits 12-17 ignored (check digit / print serial)
const SCALE_BARCODE_PATTERN = /^\d{18}$/;

export function isScaleBarcode(code: string): boolean {
  return SCALE_BARCODE_PATTERN.test(code);
}

export async function lookupByScaleBarcode(
  code: string,
): Promise<{ product: CachedProduct; weightKg: number } | { error: ScaleBarcodeError }> {
  const wareCode = code.slice(0, 7);
  const weightGrams = parseInt(code.slice(7, 12), 10);
  const weightKg = weightGrams / 1000;

  const candidates = await tx([STORE_PRODUCTS], "readonly", (t) =>
    reqToPromise(
      t.objectStore(STORE_PRODUCTS).index("scaleWareCode").getAll(wareCode) as IDBRequest<
        CachedProduct[]
      >,
    ),
  ).catch(() => [] as CachedProduct[]);

  // Every cached product is already ACTIVE/not-frozen (evicted otherwise),
  // so a hit here only needs the isScalable check — the "wrong status"
  // case can't happen from cache data, only from a genuinely unknown code.
  const match = candidates.find((p) => p.isScalable);
  if (match) return { product: match, weightKg };

  if (candidates.length > 0) {
    return {
      error: { reason: "not-scalable", wareCode, name: candidates[0].name },
    };
  }
  return { error: { reason: "no-code", wareCode } };
}

// Simple substring search across the local cache — used as the instant
// first pass for the search box, and as the offline fallback when the
// network search would otherwise hang.
export async function searchLocal(query: string, limit = 10): Promise<CachedProduct[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: CachedProduct[] = [];
  await tx([STORE_PRODUCTS], "readonly", (t) => {
    return new Promise<void>((resolve, reject) => {
      const req = t.objectStore(STORE_PRODUCTS).openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor || results.length >= limit) return resolve();
        const p: CachedProduct = cursor.value;
        if (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q))
        ) {
          results.push(p);
        }
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
    });
  });
  return results;
}
