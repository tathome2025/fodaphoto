import { appConfig } from "./config.js";
import { assertSupabaseConfigured, getCurrentUser, supabase } from "./supabase-browser.js";

export const DEFAULT_ADJUSTMENTS = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
};

export const PRESETS = [
  { id: "neutral", name: "Neutral", adjustments: { brightness: 0, contrast: 0, saturation: 0, temperature: 0 } },
  { id: "clean", name: "Clean", adjustments: { brightness: 6, contrast: 10, saturation: 4, temperature: 2 } },
  { id: "warm", name: "Warm Detail", adjustments: { brightness: 5, contrast: 8, saturation: 10, temperature: 12 } },
  { id: "drama", name: "Contrast Drama", adjustments: { brightness: -4, contrast: 24, saturation: 6, temperature: -4 } },
  { id: "mono", name: "Mono Workshop", adjustments: { brightness: 10, contrast: 12, saturation: -100, temperature: 0 } },
];

const signedUrlCache = new Map();

export function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function cloneAdjustments(adjustments) {
  return {
    brightness: Number(adjustments?.brightness || 0),
    contrast: Number(adjustments?.contrast || 0),
    saturation: Number(adjustments?.saturation || 0),
    temperature: Number(adjustments?.temperature || 0),
  };
}

export function hasAdjustments(adjustments) {
  return Object.values(cloneAdjustments(adjustments)).some((value) => value !== 0);
}

function formatParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: appConfig.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: map.year,
    month: map.month,
    day: map.day,
  };
}

export function todayLocal() {
  const parts = formatParts(new Date());
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatDateHeading(dateText) {
  return new Intl.DateTimeFormat("zh-Hant-HK", {
    timeZone: appConfig.timezone,
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(`${dateText}T00:00:00`));
}

export function formatDateTime(dateTimeText) {
  return new Intl.DateTimeFormat("zh-Hant-HK", {
    timeZone: appConfig.timezone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateTimeText));
}

export function formatMonthHeading(date) {
  return new Intl.DateTimeFormat("zh-Hant-HK", {
    timeZone: appConfig.timezone,
    year: "numeric",
    month: "long",
  }).format(date);
}

export function getMonthMatrix(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const firstWeekday = first.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, monthIndex, day));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

export function sanitizeFileName(value) {
  return (value || "").replace(/[\\/:*?"<>|]/g, "-").trim() || "untitled";
}

function joinItemNames(itemNames) {
  return (itemNames || []).filter(Boolean).join("+");
}

function timeZoneOffsetMinutes(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: appConfig.timezone,
    timeZoneName: "shortOffset",
    hour: "2-digit",
  }).formatToParts(date);
  const offsetText = parts.find((part) => part.type === "timeZoneName")?.value || "GMT+0";
  const match = offsetText.match(/GMT([+-]\d{1,2})(?::?(\d{2}))?/i);
  if (!match) {
    return 0;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  return hours * 60 + (hours >= 0 ? minutes : -minutes);
}

function localDateStartIso(dateText) {
  const [year, month, day] = dateText.split("-").map(Number);
  const offset = timeZoneOffsetMinutes(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)));
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - (offset * 60 * 1000)).toISOString();
}

function nextLocalDateText(dateText) {
  const [year, month, day] = dateText.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

function localDateEndExclusiveIso(dateText) {
  return localDateStartIso(nextLocalDateText(dateText));
}

function localDateKeyFromTimestamp(timestamp) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: appConfig.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

export function dateKeyFromTimestamp(timestamp) {
  return localDateKeyFromTimestamp(timestamp);
}

function isTimestampOnLocalDate(timestamp, dateText) {
  return localDateKeyFromTimestamp(timestamp) === dateText;
}

async function getOperatorLabel() {
  const user = await getCurrentUser();
  return user?.email || user?.phone || user?.id || "unknown-user";
}

export function buildFolderName(captureSet) {
  const suffix = [...new Set((captureSet.accessoryEntries || [])
    .flatMap((entry) => (
      entry.itemNames?.length
        ? entry.itemNames
        : [entry.itemName || entry.itemId || "未分類"]
    ))
    .filter(Boolean))]
    .join("+") || "未分類配件";
  return `${captureSet.brandName || captureSet.brandId || "Unknown"}_${suffix}_${captureSet.captureDate}`;
}

function fileExtension(fileName, mimeType) {
  const fromName = (fileName || "").split(".").pop()?.toLowerCase();
  if (fromName && fromName !== fileName) {
    return fromName;
  }
  if (/png/i.test(mimeType || "")) {
    return "png";
  }
  return "jpg";
}

function baseStoragePath(userId, captureDate, captureSetId) {
  const [year, month, day] = captureDate.split("-");
  return `${userId}/originals/${year}/${month}/${day}/${captureSetId}`;
}

export async function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("圖片載入失敗"));
    image.src = source;
  });
}

async function readImageSize(source) {
  const image = await loadImage(source);
  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
}

async function rasterizePreviewFromFile(file) {
  if (typeof createImageBitmap !== "function") {
    throw new Error("瀏覽器不支援 createImageBitmap");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("無法建立圖片預覽 canvas");
    }
    context.drawImage(bitmap, 0, 0);
    return {
      previewUrl: canvas.toDataURL("image/jpeg", 0.92),
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    if (typeof bitmap.close === "function") {
      bitmap.close();
    }
  }
}

function replaceFileExtension(fileName, extension) {
  const safeName = (fileName || "").trim() || `capture-${uid()}`;
  return safeName.replace(/\.[^./\\]+$/, "") + extension;
}

async function loadImageSource(file) {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw(context, sx, sy, side) {
        context.drawImage(bitmap, sx, sy, side, side, 0, 0, side, side);
      },
      close() {
        if (typeof bitmap.close === "function") {
          bitmap.close();
        }
      },
    };
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("無法載入圖片。"));
      img.src = objectUrl;
    });

    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      draw(context, sx, sy, side) {
        context.drawImage(image, sx, sy, side, side, 0, 0, side, side);
      },
      close() {},
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function normalizeImageFileToSquare(file, fileName) {
  const source = await loadImageSource(file);

  try {
    const side = Math.min(source.width, source.height);
    const offsetX = Math.floor((source.width - side) / 2);
    const offsetY = Math.floor((source.height - side) / 2);
    const canvas = document.createElement("canvas");
    canvas.width = side;
    canvas.height = side;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("無法建立圖片處理 canvas");
    }

    source.draw(context, offsetX, offsetY, side);
    const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
    const normalizedFileName = replaceFileExtension(fileName, ".jpg");
    const normalizedFile = typeof File === "function"
      ? new File([blob], normalizedFileName, {
        type: "image/jpeg",
        lastModified: Date.now(),
      })
      : Object.assign(blob, { name: normalizedFileName });

    return {
      file: normalizedFile,
      fileName: normalizedFileName,
      mimeType: "image/jpeg",
      previewUrl: canvas.toDataURL("image/jpeg", 0.92),
      width: side,
      height: side,
    };
  } finally {
    source.close();
  }
}

export async function fileToDraftAsset(file) {
  const originalFileName = file.name || `capture-${uid()}.jpg`;
  const localId = uid();

  try {
    const normalized = await normalizeImageFileToSquare(file, originalFileName);
    return {
      localId,
      file: normalized.file,
      previewUrl: normalized.previewUrl,
      fileName: normalized.fileName,
      mimeType: normalized.mimeType,
      width: normalized.width,
      height: normalized.height,
    };
  } catch (error) {
    try {
      const rendered = await rasterizePreviewFromFile(file);
      return {
        localId,
        file,
        previewUrl: rendered.previewUrl,
        fileName: originalFileName,
        mimeType: file.type || "image/jpeg",
        width: rendered.width,
        height: rendered.height,
      };
    } catch (_fallbackError) {
      const previewUrl = URL.createObjectURL(file);
      return {
        localId,
        file,
        previewUrl,
        fileName: originalFileName,
        mimeType: file.type || "image/jpeg",
        width: 0,
        height: 0,
      };
    }
  }
}

export function revokeDraftAsset(asset) {
  if (asset?.previewUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(asset.previewUrl);
  }
}

function normalizeLookupRows(rows) {
  return (rows || []).map((row) => ({
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
  }));
}

function normalizeLookupName(value) {
  return (value || "").trim().replace(/\s+/g, " ");
}

function slugifyLookupName(value) {
  return normalizeLookupName(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildLookupId(prefix, name) {
  const slug = slugifyLookupName(name);
  const suffix = uid().split("-").pop();
  return `${prefix}-${slug || "custom"}-${suffix}`;
}

function normalizeVehicleModelName(value) {
  return (value || "").trim().replace(/\s+/g, " ");
}

function vehicleModelKey(value) {
  return normalizeVehicleModelName(value).toLowerCase();
}

export async function fetchBrands() {
  const client = assertSupabaseConfigured();
  const { data, error } = await client
    .from("brands")
    .select("id, name, sort_order, created_at")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }
  return normalizeLookupRows(data);
}

export async function fetchServiceItems() {
  const client = assertSupabaseConfigured();
  const { data, error } = await client
    .from("service_items")
    .select("id, name, sort_order, created_at")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }
  return normalizeLookupRows(data);
}

async function findLookupByName(table, normalizedName) {
  const client = assertSupabaseConfigured();
  const { data, error } = await client
    .from(table)
    .select("id, name, sort_order")
    .eq("is_active", true)
    .ilike("name", normalizedName)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data
    ? {
        id: data.id,
        name: data.name,
        sortOrder: data.sort_order,
      }
    : null;
}

async function insertLookupRow(table, prefix, name, extra = {}) {
  const client = assertSupabaseConfigured();
  const normalizedName = normalizeLookupName(name);
  if (!normalizedName) {
    throw new Error("請先輸入名稱。");
  }

  const existing = await findLookupByName(table, normalizedName);
  if (existing) {
    return existing;
  }

  const { data: lastRow, error: lastRowError } = await client
    .from(table)
    .select("sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastRowError) {
    throw lastRowError;
  }

  const nextSortOrder = Number(lastRow?.sort_order || 0) + 10;
  const { data, error } = await client
    .from(table)
    .insert({
      id: buildLookupId(prefix, normalizedName),
      name: normalizedName,
      sort_order: nextSortOrder,
      is_active: true,
      ...extra,
    })
    .select("id, name, sort_order")
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    sortOrder: data.sort_order,
  };
}

export async function createBrand(name) {
  return insertLookupRow("brands", "brand", name);
}

export async function createServiceItem(name) {
  return insertLookupRow("service_items", "service", name, {
    category: "custom",
  });
}

export async function fetchRecentVehicleModels(brandId, limit = 20) {
  if (!brandId) {
    return [];
  }

  const client = assertSupabaseConfigured();
  try {
    const { data, error } = await client
      .from("brand_vehicle_models")
      .select("brand_id, model_name, last_used_at")
      .eq("brand_id", brandId)
      .order("last_used_at", { ascending: false })
      .order("model_name", { ascending: true })
      .limit(limit);

    if (error) {
      if (isMissingRelationError(error, "brand_vehicle_models")) {
        return [];
      }
      throw error;
    }

    return (data || []).map((item) => ({
      brandId: item.brand_id,
      model: item.model_name,
      lastUsedAt: item.last_used_at,
    }));
  } catch (error) {
    if (isMissingRelationError(error, "brand_vehicle_models")) {
      return [];
    }
    throw error;
  }
}

export async function rememberVehicleModel(brandId, modelName) {
  const client = assertSupabaseConfigured();
  const normalized = normalizeVehicleModelName(modelName);
  if (!brandId || !normalized) {
    return null;
  }

  const now = new Date().toISOString();
  try {
    const { data, error } = await client
      .from("brand_vehicle_models")
      .upsert({
        brand_id: brandId,
        model_key: vehicleModelKey(normalized),
        model_name: normalized,
        last_used_at: now,
        updated_at: now,
      }, {
        onConflict: "brand_id,model_key",
        ignoreDuplicates: false,
      })
      .select("brand_id, model_name, last_used_at")
      .single();

    if (error) {
      if (isMissingRelationError(error, "brand_vehicle_models")) {
        return {
          brandId,
          model: normalized,
          lastUsedAt: now,
        };
      }
      throw error;
    }

    return {
      brandId: data.brand_id,
      model: data.model_name,
      lastUsedAt: data.last_used_at,
    };
  } catch (error) {
    if (isMissingRelationError(error, "brand_vehicle_models")) {
      return {
        brandId,
        model: normalized,
        lastUsedAt: now,
      };
    }
    throw error;
  }
}

export async function fetchFilters() {
  const client = assertSupabaseConfigured();
  const { data, error } = await client
    .from("filters")
    .select("id, name, adjustments, is_shared, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map((filter) => ({
    id: filter.id,
    name: filter.name,
    adjustments: cloneAdjustments(filter.adjustments),
    isShared: Boolean(filter.is_shared),
    createdAt: filter.created_at,
  }));
}

export async function createFilter(name, adjustments) {
  const client = assertSupabaseConfigured();
  const user = await getCurrentUser();
  const payload = {
    name: name.trim(),
    adjustments: cloneAdjustments(adjustments),
    is_shared: false,
    created_by: user.id,
  };

  const { data, error } = await client
    .from("filters")
    .insert(payload)
    .select("id, name, adjustments, is_shared, created_at")
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    adjustments: cloneAdjustments(data.adjustments),
    isShared: Boolean(data.is_shared),
    createdAt: data.created_at,
  };
}

async function fetchCurrentEditsByPhotoIds(photoIds) {
  if (!photoIds.length) {
    return new Map();
  }

  const client = assertSupabaseConfigured();
  const { data, error } = await client
    .from("photo_edits")
    .select("id, photo_id, filter_id, adjustments, edited_storage_path, is_current, created_at")
    .in("photo_id", photoIds)
    .eq("is_current", true);

  if (error) {
    throw error;
  }

  return new Map((data || []).map((edit) => [edit.photo_id, edit]));
}

function isMissingRelationError(error, relationName) {
  const message = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
  return message.includes(relationName.toLowerCase()) && message.includes("does not exist");
}

async function fetchPhotoServiceItemsMap(photoIds) {
  if (!photoIds.length) {
    return new Map();
  }

  const client = assertSupabaseConfigured();

  try {
    const { data, error } = await client
      .from("photo_service_items")
      .select("photo_id, service_item_id, sort_order")
      .in("photo_id", photoIds)
      .order("photo_id", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error) {
      if (isMissingRelationError(error, "photo_service_items")) {
        return new Map();
      }
      throw error;
    }

    return (data || []).reduce((map, row) => {
      const list = map.get(row.photo_id) || [];
      list.push(row);
      map.set(row.photo_id, list);
      return map;
    }, new Map());
  } catch (error) {
    if (isMissingRelationError(error, "photo_service_items")) {
      return new Map();
    }
    throw error;
  }
}

function normalizeServiceItemsForPhoto(photo, captureSet, photoServiceItemMap) {
  const linkedRows = photoServiceItemMap.get(photo.id) || [];
  const itemIds = [...new Set([
    ...linkedRows.map((row) => row.service_item_id),
    photo.service_item_id,
  ].filter(Boolean))];
  const itemNames = itemIds.map((itemId) => captureSet.serviceItemLookup.get(itemId)?.name || itemId);

  return {
    itemIds,
    itemNames,
    itemLabel: joinItemNames(itemNames),
    primaryItemId: itemIds[0] || photo.service_item_id || "",
  };
}

function groupPhotos(captureSet, photos, currentEdits, photoServiceItemMap) {
  const vehiclePhotos = [];
  const accessoryEntries = [];

  photos.forEach((photo) => {
    const edit = currentEdits.get(photo.id);
    const serviceItems = normalizeServiceItemsForPhoto(photo, captureSet, photoServiceItemMap);
    const normalized = {
      id: photo.id,
      kind: photo.kind,
      serviceItemId: serviceItems.primaryItemId,
      serviceItemIds: serviceItems.itemIds,
      itemId: serviceItems.primaryItemId,
      itemIds: serviceItems.itemIds,
      itemName: serviceItems.itemNames[0] || serviceItems.primaryItemId || "",
      itemNames: serviceItems.itemNames,
      itemLabel: serviceItems.itemLabel,
      itemNote: photo.item_note || "",
      storagePath: photo.storage_path,
      fileName: photo.original_file_name,
      originalFileName: photo.original_file_name,
      mimeType: photo.mime_type,
      width: photo.width,
      height: photo.height,
      createdAt: photo.created_at,
      createdBy: photo.created_by || null,
      createdByLabel: photo.created_by_label || "",
      savedFilterId: edit?.filter_id || null,
      adjustments: cloneAdjustments(edit?.adjustments || DEFAULT_ADJUSTMENTS),
    };

    if (normalized.kind === "vehicle") {
      vehiclePhotos.push(normalized);
      return;
    }

    accessoryEntries.push({
      id: `${captureSet.id}:${photo.id}`,
      itemId: normalized.itemId,
      itemIds: normalized.itemIds,
      itemName: normalized.itemName,
      itemNames: normalized.itemNames,
      itemLabel: normalized.itemLabel,
      notes: normalized.itemNote,
      photos: [normalized],
    });
  });

  return {
    ...captureSet,
    vehiclePhotos,
    accessoryEntries,
  };
}

export function flattenPhotosForSet(captureSet) {
  const vehiclePhotos = (captureSet.vehiclePhotos || []).map((photo) => ({
    photo,
    kindLabel: "車輛照",
    itemName: null,
    itemNames: [],
  }));

  const accessoryPhotos = (captureSet.accessoryEntries || []).flatMap((entry) =>
    (entry.photos || []).map((photo) => ({
      photo,
      kindLabel: "配件 / 維修",
      itemName: photo.itemLabel || entry.itemLabel || joinItemNames(entry.itemNames) || entry.itemName || entry.itemId,
      itemNames: photo.itemNames || entry.itemNames || [],
    }))
  );

  return [...vehiclePhotos, ...accessoryPhotos];
}

async function loadLookups() {
  const [brands, serviceItems] = await Promise.all([fetchBrands(), fetchServiceItems()]);
  return {
    brandLookup: new Map(brands.map((brand) => [brand.id, brand])),
    serviceItemLookup: new Map(serviceItems.map((item) => [item.id, item])),
  };
}

async function hydrateCaptureSetRows(sets, lookups) {
  if (!sets?.length) {
    return [];
  }

  const setIds = sets.map((captureSet) => captureSet.id);
  const { data: photos, error: photoError } = await assertSupabaseConfigured()
    .from("photos")
    .select("id, capture_set_id, kind, service_item_id, item_note, storage_path, original_file_name, mime_type, width, height, sort_order, created_at, created_by, created_by_label")
    .in("capture_set_id", setIds)
    .order("capture_set_id", { ascending: true })
    .order("sort_order", { ascending: true });

  if (photoError) {
    throw photoError;
  }

  const photoIds = (photos || []).map((photo) => photo.id);
  const currentEdits = await fetchCurrentEditsByPhotoIds(photoIds);
  const photoServiceItemMap = await fetchPhotoServiceItemsMap(photoIds);

  return sets.map((captureSet) => {
    const base = {
      id: captureSet.id,
      reference: captureSet.reference,
      captureDate: captureSet.capture_date,
      notes: captureSet.notes,
      brandId: captureSet.brand_id,
      vehicleModel: captureSet.vehicle_model || "",
      brandName: lookups.brandLookup.get(captureSet.brand_id)?.name || captureSet.brand_id,
      createdAt: captureSet.created_at,
      createdBy: captureSet.created_by || null,
      createdByLabel: captureSet.created_by_label || "",
      serviceCompletedAt: captureSet.service_completed_at || null,
      serviceCompletedBy: captureSet.service_completed_by || null,
      serviceCompletedByLabel: captureSet.service_completed_by_label || "",
      updatedAt: captureSet.updated_at || captureSet.created_at,
      serviceItemLookup: lookups.serviceItemLookup,
    };

    const setPhotos = (photos || []).filter((photo) => photo.capture_set_id === captureSet.id);
    return groupPhotos(base, setPhotos, currentEdits, photoServiceItemMap);
  });
}

export async function fetchCaptureSetsByDate(date) {
  const client = assertSupabaseConfigured();
  const lookups = await loadLookups();

  const { data: sets, error: setError } = await client
    .from("capture_sets")
    .select("id, reference, capture_date, notes, brand_id, vehicle_model, created_at, created_by, created_by_label, service_completed_at, service_completed_by, service_completed_by_label, updated_at")
    .eq("capture_date", date)
    .order("created_at", { ascending: false });

  if (setError) {
    throw setError;
  }

  return hydrateCaptureSetRows(sets || [], lookups);
}

export async function fetchRecentCheckInSets(limit = 24) {
  const client = assertSupabaseConfigured();
  const lookups = await loadLookups();

  const { data: sets, error } = await client
    .from("capture_sets")
    .select("id, reference, capture_date, notes, brand_id, vehicle_model, created_at, created_by, created_by_label, service_completed_at, service_completed_by, service_completed_by_label, updated_at")
    .is("service_completed_at", null)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  const hydrated = await hydrateCaptureSetRows(sets || [], lookups);
  return hydrated.filter((captureSet) => captureSet.vehiclePhotos.length > 0);
}

export async function fetchDatesWithUploads(year, month) {
  const client = assertSupabaseConfigured();
  const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const end = new Date(year, month + 1, 0);
  const endText = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;

  const { data, error } = await client
    .from("capture_sets")
    .select("id, capture_date")
    .gte("capture_date", start)
    .lte("capture_date", endText);

  if (error) {
    throw error;
  }

  if (!data?.length) {
    return {};
  }

  const counts = {};
  const ids = data.map((item) => item.id);
  const { data: photos, error: photoError } = await client
    .from("photos")
    .select("capture_set_id")
    .in("capture_set_id", ids);

  if (photoError) {
    throw photoError;
  }

  const photoCountBySet = (photos || []).reduce((map, photo) => {
    map.set(photo.capture_set_id, (map.get(photo.capture_set_id) || 0) + 1);
    return map;
  }, new Map());

  data.forEach((item) => {
    counts[item.capture_date] = (counts[item.capture_date] || 0) + (photoCountBySet.get(item.id) || 0);
  });

  return counts;
}

async function uploadPhotoAsset(userId, captureDate, captureSetId, asset) {
  const client = assertSupabaseConfigured();
  const photoId = uid();
  const extension = fileExtension(asset.fileName, asset.mimeType);
  const storagePath = `${baseStoragePath(userId, captureDate, captureSetId)}/${photoId}.${extension}`;

  const { error } = await client.storage
    .from(appConfig.storageBucket)
    .upload(storagePath, asset.file, {
      cacheControl: "3600",
      contentType: asset.mimeType,
      upsert: false,
    });

  if (error) {
    throw error;
  }

  return {
    id: photoId,
    storagePath,
  };
}

async function insertCaptureSetPhotos({ captureSetId, captureDate, userId, operatorLabel, vehiclePhotos = [], accessoryEntries = [] }) {
  const client = assertSupabaseConfigured();
  const photoRows = [];
  const photoServiceItemRows = [];

  for (const [index, asset] of vehiclePhotos.entries()) {
    const upload = await uploadPhotoAsset(userId, captureDate, captureSetId, asset);
    photoRows.push({
      id: upload.id,
      capture_set_id: captureSetId,
      kind: "vehicle",
      service_item_id: null,
      item_note: "",
      storage_path: upload.storagePath,
      original_file_name: asset.fileName,
      mime_type: asset.mimeType,
      width: asset.width,
      height: asset.height,
      sort_order: index * 10 + 10,
      created_by: userId,
      created_by_label: operatorLabel,
    });
  }

  let accessorySortOrder = 1000;
  for (const entry of accessoryEntries) {
    for (const asset of entry.photos) {
      const upload = await uploadPhotoAsset(userId, captureDate, captureSetId, asset);
      const selectedItemIds = [...new Set((entry.itemIds || []).filter(Boolean))];
      photoRows.push({
        id: upload.id,
        capture_set_id: captureSetId,
        kind: "accessory",
        service_item_id: selectedItemIds[0] || null,
        item_note: entry.notes || "",
        storage_path: upload.storagePath,
        original_file_name: asset.fileName,
        mime_type: asset.mimeType,
        width: asset.width,
        height: asset.height,
        sort_order: accessorySortOrder,
        created_by: userId,
        created_by_label: operatorLabel,
      });

      selectedItemIds.forEach((itemId, index) => {
        photoServiceItemRows.push({
          photo_id: upload.id,
          service_item_id: itemId,
          sort_order: index * 10 + 10,
        });
      });
      accessorySortOrder += 10;
    }
  }

  if (photoRows.length) {
    const { error: photoInsertError } = await client.from("photos").insert(photoRows);
    if (photoInsertError) {
      throw photoInsertError;
    }
  }

  if (photoServiceItemRows.length) {
    const { error: linkInsertError } = await client.from("photo_service_items").insert(photoServiceItemRows);
    if (linkInsertError) {
      throw linkInsertError;
    }
  }
}

async function touchCaptureSet(captureSetId) {
  const client = assertSupabaseConfigured();
  const { error } = await client
    .from("capture_sets")
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq("id", captureSetId);

  if (error) {
    throw error;
  }
}

export async function createCheckInSet(payload) {
  const client = assertSupabaseConfigured();
  const user = await getCurrentUser();
  const operatorLabel = await getOperatorLabel();
  const captureSetId = uid();
  const captureDate = payload.captureDate || todayLocal();

  const { error: insertSetError } = await client.from("capture_sets").insert({
    id: captureSetId,
    reference: payload.reference,
    capture_date: captureDate,
    notes: payload.notes || "",
    brand_id: payload.brandId,
    vehicle_model: payload.vehicleModel || "",
    created_by: user.id,
    created_by_label: operatorLabel,
  });

  if (insertSetError) {
    throw insertSetError;
  }

  await insertCaptureSetPhotos({
    captureSetId,
    captureDate,
    userId: user.id,
    operatorLabel,
    vehiclePhotos: payload.vehiclePhotos || [],
  });

  return {
    id: captureSetId,
    captureDate,
    reference: payload.reference,
    vehicleModel: payload.vehicleModel || "",
  };
}

export async function appendServiceEntriesToCaptureSet(captureSetId, accessoryEntries) {
  const client = assertSupabaseConfigured();
  const user = await getCurrentUser();
  const operatorLabel = await getOperatorLabel();

  const { data: captureSet, error: captureSetError } = await client
    .from("capture_sets")
    .select("id, reference, capture_date, vehicle_model")
    .eq("id", captureSetId)
    .single();

  if (captureSetError) {
    throw captureSetError;
  }

  await insertCaptureSetPhotos({
    captureSetId,
    captureDate: captureSet.capture_date,
    userId: user.id,
    operatorLabel,
    accessoryEntries: accessoryEntries || [],
  });
  await touchCaptureSet(captureSetId);

  return {
    id: captureSet.id,
    reference: captureSet.reference,
    captureDate: captureSet.capture_date,
    vehicleModel: captureSet.vehicle_model || "",
  };
}

export async function markCaptureSetServiceCompleted(captureSetId) {
  const client = assertSupabaseConfigured();
  const user = await getCurrentUser();
  const operatorLabel = await getOperatorLabel();
  const now = new Date().toISOString();

  const { data, error } = await client
    .from("capture_sets")
    .update({
      service_completed_at: now,
      service_completed_by: user.id,
      service_completed_by_label: operatorLabel,
      updated_at: now,
    })
    .eq("id", captureSetId)
    .is("service_completed_at", null)
    .select("id, reference")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || {
    id: captureSetId,
    reference: "",
  };
}

export async function createCaptureSet(payload) {
  const captureSet = await createCheckInSet(payload);
  if (payload.accessoryEntries?.length) {
    await appendServiceEntriesToCaptureSet(captureSet.id, payload.accessoryEntries);
  }
  return captureSet;
}

export async function fetchPhotoDetail(photoId) {
  const client = assertSupabaseConfigured();
  const lookups = await loadLookups();

  const { data: photo, error: photoError } = await client
    .from("photos")
    .select("id, capture_set_id, kind, service_item_id, item_note, storage_path, original_file_name, mime_type, width, height, created_at, created_by, created_by_label")
    .eq("id", photoId)
    .single();

  if (photoError) {
    throw photoError;
  }

  const { data: captureSet, error: setError } = await client
    .from("capture_sets")
    .select("id, reference, capture_date, notes, brand_id, vehicle_model, created_at, created_by, created_by_label, service_completed_at, service_completed_by, service_completed_by_label")
    .eq("id", photo.capture_set_id)
    .single();

  if (setError) {
    throw setError;
  }

  const { data: setPhotos, error: setPhotosError } = await client
    .from("photos")
    .select("id, service_item_id, kind")
    .eq("capture_set_id", captureSet.id)
    .eq("kind", "accessory");

  if (setPhotosError) {
    throw setPhotosError;
  }

  const currentEdits = await fetchCurrentEditsByPhotoIds([photo.id]);
  const setPhotoIds = (setPhotos || []).map((item) => item.id);
  const photoServiceItemMap = await fetchPhotoServiceItemsMap([
    ...new Set([photo.id, ...setPhotoIds]),
  ]);
  const edit = currentEdits.get(photo.id);
  const detailServiceItems = normalizeServiceItemsForPhoto(photo, { serviceItemLookup: lookups.serviceItemLookup }, photoServiceItemMap);

  const captureSetAccessoryIds = [...new Set((setPhotos || []).flatMap((setPhoto) => {
    const linked = photoServiceItemMap.get(setPhoto.id) || [];
    return [
      ...linked.map((row) => row.service_item_id),
      setPhoto.service_item_id,
    ].filter(Boolean);
  }))];

  return {
    captureSet: {
      id: captureSet.id,
      reference: captureSet.reference,
      captureDate: captureSet.capture_date,
      notes: captureSet.notes,
      brandId: captureSet.brand_id,
      vehicleModel: captureSet.vehicle_model || "",
      brandName: lookups.brandLookup.get(captureSet.brand_id)?.name || captureSet.brand_id,
      createdAt: captureSet.created_at,
      createdBy: captureSet.created_by || null,
      createdByLabel: captureSet.created_by_label || "",
      serviceCompletedAt: captureSet.service_completed_at || null,
      serviceCompletedBy: captureSet.service_completed_by || null,
      serviceCompletedByLabel: captureSet.service_completed_by_label || "",
      accessoryEntries: captureSetAccessoryIds.map((itemId) => ({
        itemId,
        itemName: lookups.serviceItemLookup.get(itemId)?.name || itemId,
        itemNames: [lookups.serviceItemLookup.get(itemId)?.name || itemId],
      })),
    },
    photo: {
      id: photo.id,
      kind: photo.kind,
      itemId: detailServiceItems.primaryItemId,
      itemIds: detailServiceItems.itemIds,
      itemName: detailServiceItems.itemNames[0] || detailServiceItems.primaryItemId,
      itemNames: detailServiceItems.itemNames,
      itemLabel: detailServiceItems.itemLabel,
      itemNote: photo.item_note || "",
      storagePath: photo.storage_path,
      fileName: photo.original_file_name,
      mimeType: photo.mime_type,
      width: photo.width,
      height: photo.height,
      createdAt: photo.created_at,
      createdBy: photo.created_by || null,
      createdByLabel: photo.created_by_label || "",
      savedFilterId: edit?.filter_id || null,
      adjustments: cloneAdjustments(edit?.adjustments || DEFAULT_ADJUSTMENTS),
    },
  };
}

export async function fetchActivityDates(year, month) {
  const client = assertSupabaseConfigured();
  const startText = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const monthEnd = new Date(Date.UTC(year, month + 1, 0));
  const endText = `${monthEnd.getUTCFullYear()}-${String(monthEnd.getUTCMonth() + 1).padStart(2, "0")}-${String(monthEnd.getUTCDate()).padStart(2, "0")}`;
  const rangeStart = localDateStartIso(startText);
  const rangeEndExclusive = localDateEndExclusiveIso(endText);

  const [{ data: sets, error: setError }, { data: photos, error: photoError }] = await Promise.all([
    client
      .from("capture_sets")
      .select("id, created_at")
      .gte("created_at", rangeStart)
      .lt("created_at", rangeEndExclusive),
    client
      .from("photos")
      .select("capture_set_id, created_at")
      .gte("created_at", rangeStart)
      .lt("created_at", rangeEndExclusive),
  ]);

  if (setError) {
    throw setError;
  }
  if (photoError) {
    throw photoError;
  }

  const counts = new Map();
  (sets || []).forEach((record) => {
    const key = localDateKeyFromTimestamp(record.created_at);
    if (!counts.has(key)) {
      counts.set(key, new Set());
    }
    counts.get(key).add(record.id);
  });
  (photos || []).forEach((record) => {
    const key = localDateKeyFromTimestamp(record.created_at);
    if (!counts.has(key)) {
      counts.set(key, new Set());
    }
    counts.get(key).add(record.capture_set_id);
  });

  return Object.fromEntries([...counts.entries()].map(([key, ids]) => [key, ids.size]));
}

export async function fetchCaptureSetsByActivityDate(dateText) {
  const client = assertSupabaseConfigured();
  const lookups = await loadLookups();
  const rangeStart = localDateStartIso(dateText);
  const rangeEndExclusive = localDateEndExclusiveIso(dateText);

  const [{ data: setsCreated, error: setError }, { data: photosCreated, error: photoError }] = await Promise.all([
    client
      .from("capture_sets")
      .select("id")
      .gte("created_at", rangeStart)
      .lt("created_at", rangeEndExclusive),
    client
      .from("photos")
      .select("capture_set_id")
      .gte("created_at", rangeStart)
      .lt("created_at", rangeEndExclusive),
  ]);

  if (setError) {
    throw setError;
  }
  if (photoError) {
    throw photoError;
  }

  const setIds = [...new Set([
    ...(setsCreated || []).map((record) => record.id),
    ...(photosCreated || []).map((record) => record.capture_set_id),
  ])];

  if (!setIds.length) {
    return [];
  }

  const { data: sets, error } = await client
    .from("capture_sets")
    .select("id, reference, capture_date, notes, brand_id, vehicle_model, created_at, created_by, created_by_label, service_completed_at, service_completed_by, service_completed_by_label, updated_at")
    .in("id", setIds)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  const hydrated = await hydrateCaptureSetRows(sets || [], lookups);
  return hydrated
    .map((captureSet) => ({
      ...captureSet,
      activityOnDate: {
        hasCheckIn: isTimestampOnLocalDate(captureSet.createdAt, dateText),
        serviceEntries: captureSet.accessoryEntries.filter((entry) =>
          entry.photos.some((photo) => isTimestampOnLocalDate(photo.createdAt, dateText))
        ),
      },
    }))
    .sort((left, right) => {
      const leftTimes = [
        left.activityOnDate.hasCheckIn ? left.createdAt : null,
        ...left.activityOnDate.serviceEntries.flatMap((entry) => entry.photos.map((photo) => photo.createdAt)),
      ].filter(Boolean);
      const rightTimes = [
        right.activityOnDate.hasCheckIn ? right.createdAt : null,
        ...right.activityOnDate.serviceEntries.flatMap((entry) => entry.photos.map((photo) => photo.createdAt)),
      ].filter(Boolean);
      const leftLatest = leftTimes.sort().slice(-1)[0] || left.updatedAt;
      const rightLatest = rightTimes.sort().slice(-1)[0] || right.updatedAt;
      return rightLatest.localeCompare(leftLatest);
    });
}

export async function fetchAllLibraryPhotos() {
  const client = assertSupabaseConfigured();
  const lookups = await loadLookups();

  const { data: photos, error: photoError } = await client
    .from("photos")
    .select("id, capture_set_id, kind, service_item_id, item_note, storage_path, original_file_name, mime_type, width, height, sort_order, created_at, created_by, created_by_label")
    .order("created_at", { ascending: false })
    .order("sort_order", { ascending: true });

  if (photoError) {
    throw photoError;
  }

  if (!photos?.length) {
    return [];
  }

  const setIds = [...new Set(photos.map((photo) => photo.capture_set_id).filter(Boolean))];
  const { data: sets, error: setError } = await client
    .from("capture_sets")
    .select("id, reference, capture_date, brand_id, vehicle_model, created_at, created_by, created_by_label")
    .in("id", setIds);

  if (setError) {
    throw setError;
  }

  const setMap = new Map((sets || []).map((captureSet) => [
    captureSet.id,
    {
      id: captureSet.id,
      reference: captureSet.reference,
      captureDate: captureSet.capture_date,
      brandId: captureSet.brand_id,
      vehicleModel: captureSet.vehicle_model || "",
      brandName: lookups.brandLookup.get(captureSet.brand_id)?.name || captureSet.brand_id,
      createdAt: captureSet.created_at,
      createdBy: captureSet.created_by || null,
      createdByLabel: captureSet.created_by_label || "",
    },
  ]));

  const photoIds = photos.map((photo) => photo.id);
  const photoServiceItemMap = await fetchPhotoServiceItemsMap(photoIds);

  return photos.map((photo) => {
    const captureSet = setMap.get(photo.capture_set_id) || null;
    const serviceItems = normalizeServiceItemsForPhoto(
      photo,
      { serviceItemLookup: lookups.serviceItemLookup },
      photoServiceItemMap
    );

    return {
      id: photo.id,
      captureSetId: photo.capture_set_id,
      kind: photo.kind,
      kindLabel: photo.kind === "vehicle" ? "車輛照" : "安裝維修保養",
      serviceItemId: serviceItems.primaryItemId,
      serviceItemIds: serviceItems.itemIds,
      itemName: serviceItems.itemNames[0] || serviceItems.primaryItemId || "",
      itemNames: serviceItems.itemNames,
      itemLabel: serviceItems.itemLabel,
      itemNote: photo.item_note || "",
      storagePath: photo.storage_path,
      fileName: photo.original_file_name,
      mimeType: photo.mime_type,
      width: photo.width,
      height: photo.height,
      createdAt: photo.created_at,
      createdBy: photo.created_by || null,
      createdByLabel: photo.created_by_label || "",
      captureSet,
    };
  });
}

export async function deleteLibraryPhotos(photos) {
  const client = assertSupabaseConfigured();
  const photoIds = [...new Set((photos || []).map((photo) => photo?.id).filter(Boolean))];
  const storagePaths = [...new Set((photos || []).map((photo) => photo?.storagePath).filter(Boolean))];

  if (!photoIds.length) {
    return 0;
  }

  const { error: deleteError } = await client
    .from("photos")
    .delete()
    .in("id", photoIds);

  if (deleteError) {
    throw deleteError;
  }

  if (storagePaths.length) {
    const { error: storageError } = await client.storage
      .from(appConfig.storageBucket)
      .remove(storagePaths);

    if (storageError) {
      throw storageError;
    }

    storagePaths.forEach((path) => {
      for (const key of signedUrlCache.keys()) {
        if (key.startsWith(`${path}:`)) {
          signedUrlCache.delete(key);
        }
      }
    });
  }

  return photoIds.length;
}

export async function upsertCurrentPhotoEdit(photoId, adjustments, filterId = null) {
  const client = assertSupabaseConfigured();
  const user = await getCurrentUser();
  const payload = {
    photo_id: photoId,
    filter_id: filterId,
    adjustments: cloneAdjustments(adjustments),
    is_current: true,
    created_by: user.id,
  };

  const { data: existing, error: existingError } = await client
    .from("photo_edits")
    .select("id")
    .eq("photo_id", photoId)
    .eq("is_current", true)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing?.id) {
    const { error } = await client
      .from("photo_edits")
      .update({
        filter_id: payload.filter_id,
        adjustments: payload.adjustments,
      })
      .eq("id", existing.id);

    if (error) {
      throw error;
    }

    return existing.id;
  }

  const { data, error } = await client
    .from("photo_edits")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    throw error;
  }
  return data.id;
}

export async function applyFilterToDate(date, filterId) {
  const client = assertSupabaseConfigured();
  const { data: filter, error: filterError } = await client
    .from("filters")
    .select("id, adjustments")
    .eq("id", filterId)
    .single();

  if (filterError) {
    throw filterError;
  }

  const captureSets = await fetchCaptureSetsByDate(date);
  const photos = captureSets.flatMap((captureSet) =>
    flattenPhotosForSet(captureSet).map((record) => record.photo)
  );

  await Promise.all(
    photos.map((photo) => upsertCurrentPhotoEdit(photo.id, filter.adjustments, filter.id))
  );

  return photos.length;
}

export async function getSignedPhotoUrl(storagePath, transform) {
  const client = assertSupabaseConfigured();
  const cacheKey = `${storagePath}:${JSON.stringify(transform || {})}`;
  if (signedUrlCache.has(cacheKey)) {
    return signedUrlCache.get(cacheKey);
  }

  const options = transform ? { transform } : undefined;
  const { data, error } = await client.storage
    .from(appConfig.storageBucket)
    .createSignedUrl(storagePath, 3600, options);

  if (error) {
    throw error;
  }

  signedUrlCache.set(cacheKey, data.signedUrl);
  return data.signedUrl;
}

export function releaseSignedUrlCache() {
  signedUrlCache.clear();
}

export function applyAdjustmentsToContext(context, width, height, adjustments) {
  const normalized = cloneAdjustments(adjustments);
  if (!hasAdjustments(normalized)) {
    return;
  }

  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;
  const brightnessShift = normalized.brightness * 2.55;
  const contrastFactor = normalized.contrast === 0
    ? 1
    : (259 * (normalized.contrast + 255)) / (255 * (259 - normalized.contrast));
  const saturationFactor = (100 + normalized.saturation) / 100;
  const temperatureShift = normalized.temperature * 1.15;

  for (let index = 0; index < data.length; index += 4) {
    let red = data[index] + brightnessShift;
    let green = data[index + 1] + brightnessShift;
    let blue = data[index + 2] + brightnessShift;

    red = contrastFactor * (red - 128) + 128;
    green = contrastFactor * (green - 128) + 128;
    blue = contrastFactor * (blue - 128) + 128;

    const gray = 0.299 * red + 0.587 * green + 0.114 * blue;
    red = gray + (red - gray) * saturationFactor;
    green = gray + (green - gray) * saturationFactor;
    blue = gray + (blue - gray) * saturationFactor;

    red += temperatureShift;
    green += temperatureShift * 0.18;
    blue -= temperatureShift;

    data[index] = clamp(Math.round(red), 0, 255);
    data[index + 1] = clamp(Math.round(green), 0, 255);
    data[index + 2] = clamp(Math.round(blue), 0, 255);
  }

  context.putImageData(imageData, 0, 0);
}

export async function renderAdjustedCanvas(canvas, source, adjustments, options) {
  const image = await loadImage(source);
  const width = options?.width || image.naturalWidth;
  const height = options?.height || image.naturalHeight;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.clearRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);
  applyAdjustmentsToContext(context, width, height, adjustments);
  return canvas;
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("輸出圖片失敗"))),
      mimeType,
      mimeType === "image/jpeg" ? quality : undefined
    );
  });
}

export async function renderAdjustedDataUrl(source, adjustments, options) {
  if (!hasAdjustments(adjustments) && !options?.width && !options?.height) {
    return source;
  }

  const canvas = document.createElement("canvas");
  await renderAdjustedCanvas(canvas, source, adjustments, options);
  return canvas.toDataURL(options?.mimeType || "image/jpeg", options?.quality || 0.88);
}

export async function renderAdjustedBlob(source, adjustments, options) {
  const canvas = document.createElement("canvas");
  await renderAdjustedCanvas(canvas, source, adjustments, options);
  return canvasToBlob(canvas, options?.mimeType || "image/jpeg", options?.quality || 0.9);
}

export function describeSupabaseError(error) {
  if (!error) {
    return "發生未知錯誤。";
  }
  if (typeof error === "string") {
    return error;
  }
  return error.message || "發生未知錯誤。";
}

export function countPhotosInSet(captureSet) {
  return flattenPhotosForSet(captureSet).length;
}

export function dedupeFilters(filters) {
  const seen = new Set();
  return filters.filter((filter) => {
    const key = `${filter.name.toLowerCase()}:${JSON.stringify(filter.adjustments)}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export { supabase };
