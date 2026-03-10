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

export function buildFolderName(captureSet) {
  const suffix = [...new Set((captureSet.accessoryEntries || [])
    .map((entry) => entry.itemName || entry.itemId || "未分類")
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

export async function fileToDraftAsset(file) {
  const fileName = file.name || `capture-${uid()}.jpg`;
  const mimeType = file.type || "image/jpeg";
  const localId = uid();
  const previewUrl = URL.createObjectURL(file);

  try {
    const dimensions = await readImageSize(previewUrl);
    return {
      localId,
      file,
      previewUrl,
      fileName,
      mimeType,
      width: dimensions.width,
      height: dimensions.height,
    };
  } catch (error) {
    try {
      const rendered = await rasterizePreviewFromFile(file);
      URL.revokeObjectURL(previewUrl);
      return {
        localId,
        file,
        previewUrl: rendered.previewUrl,
        fileName,
        mimeType,
        width: rendered.width,
        height: rendered.height,
      };
    } catch (_fallbackError) {
      return {
        localId,
        file,
        previewUrl,
        fileName,
        mimeType,
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

export async function fetchBrands() {
  const client = assertSupabaseConfigured();
  const { data, error } = await client
    .from("brands")
    .select("id, name, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }
  return normalizeLookupRows(data);
}

export async function fetchServiceItems() {
  const client = assertSupabaseConfigured();
  const { data, error } = await client
    .from("service_items")
    .select("id, name, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }
  return normalizeLookupRows(data);
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

function groupPhotos(captureSet, photos, currentEdits) {
  const vehiclePhotos = [];
  const accessoryMap = new Map();

  photos.forEach((photo) => {
    const edit = currentEdits.get(photo.id);
    const normalized = {
      id: photo.id,
      kind: photo.kind,
      serviceItemId: photo.service_item_id,
      itemId: photo.service_item_id,
      itemNote: photo.item_note || "",
      storagePath: photo.storage_path,
      fileName: photo.original_file_name,
      originalFileName: photo.original_file_name,
      mimeType: photo.mime_type,
      width: photo.width,
      height: photo.height,
      createdAt: photo.created_at,
      savedFilterId: edit?.filter_id || null,
      adjustments: cloneAdjustments(edit?.adjustments || DEFAULT_ADJUSTMENTS),
    };

    if (normalized.kind === "vehicle") {
      vehiclePhotos.push(normalized);
      return;
    }

    const key = normalized.serviceItemId || "unknown";
    const existing = accessoryMap.get(key) || {
      id: `${captureSet.id}:${key}`,
      itemId: key,
      itemName: captureSet.serviceItemLookup.get(key)?.name || key,
      notes: normalized.itemNote,
      photos: [],
    };
    existing.photos.push(normalized);
    accessoryMap.set(key, existing);
  });

  return {
    ...captureSet,
    vehiclePhotos,
    accessoryEntries: [...accessoryMap.values()],
  };
}

export function flattenPhotosForSet(captureSet) {
  const vehiclePhotos = (captureSet.vehiclePhotos || []).map((photo) => ({
    photo,
    kindLabel: "車輛照",
    itemName: null,
  }));

  const accessoryPhotos = (captureSet.accessoryEntries || []).flatMap((entry) =>
    (entry.photos || []).map((photo) => ({
      photo,
      kindLabel: "配件 / 維修",
      itemName: entry.itemName || entry.itemId,
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

export async function fetchCaptureSetsByDate(date) {
  const client = assertSupabaseConfigured();
  const lookups = await loadLookups();

  const { data: sets, error: setError } = await client
    .from("capture_sets")
    .select("id, reference, capture_date, notes, brand_id, vehicle_model, created_at")
    .eq("capture_date", date)
    .order("created_at", { ascending: false });

  if (setError) {
    throw setError;
  }

  if (!sets?.length) {
    return [];
  }

  const setIds = sets.map((captureSet) => captureSet.id);
  const { data: photos, error: photoError } = await client
    .from("photos")
    .select("id, capture_set_id, kind, service_item_id, item_note, storage_path, original_file_name, mime_type, width, height, sort_order, created_at")
    .in("capture_set_id", setIds)
    .order("capture_set_id", { ascending: true })
    .order("sort_order", { ascending: true });

  if (photoError) {
    throw photoError;
  }

  const photoIds = (photos || []).map((photo) => photo.id);
  const currentEdits = await fetchCurrentEditsByPhotoIds(photoIds);

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
      serviceItemLookup: lookups.serviceItemLookup,
    };

    const setPhotos = (photos || []).filter((photo) => photo.capture_set_id === captureSet.id);
    return groupPhotos(base, setPhotos, currentEdits);
  });
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

export async function createCaptureSet(payload) {
  const client = assertSupabaseConfigured();
  const user = await getCurrentUser();
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
  });

  if (insertSetError) {
    throw insertSetError;
  }

  const photoRows = [];

  for (const [index, asset] of payload.vehiclePhotos.entries()) {
    const upload = await uploadPhotoAsset(user.id, captureDate, captureSetId, asset);
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
    });
  }

  let accessorySortOrder = 1000;
  for (const entry of payload.accessoryEntries) {
    for (const asset of entry.photos) {
      const upload = await uploadPhotoAsset(user.id, captureDate, captureSetId, asset);
      photoRows.push({
        id: upload.id,
        capture_set_id: captureSetId,
        kind: "accessory",
        service_item_id: entry.itemId,
        item_note: entry.notes || "",
        storage_path: upload.storagePath,
        original_file_name: asset.fileName,
        mime_type: asset.mimeType,
        width: asset.width,
        height: asset.height,
        sort_order: accessorySortOrder,
      });
      accessorySortOrder += 10;
    }
  }

  const { error: photoInsertError } = await client.from("photos").insert(photoRows);
  if (photoInsertError) {
    throw photoInsertError;
  }

  return {
    id: captureSetId,
    captureDate,
    reference: payload.reference,
    vehicleModel: payload.vehicleModel || "",
  };
}

export async function fetchPhotoDetail(photoId) {
  const client = assertSupabaseConfigured();
  const lookups = await loadLookups();

  const { data: photo, error: photoError } = await client
    .from("photos")
    .select("id, capture_set_id, kind, service_item_id, item_note, storage_path, original_file_name, mime_type, width, height, created_at")
    .eq("id", photoId)
    .single();

  if (photoError) {
    throw photoError;
  }

  const { data: captureSet, error: setError } = await client
    .from("capture_sets")
    .select("id, reference, capture_date, notes, brand_id, vehicle_model, created_at")
    .eq("id", photo.capture_set_id)
    .single();

  if (setError) {
    throw setError;
  }

  const { data: setPhotos, error: setPhotosError } = await client
    .from("photos")
    .select("service_item_id, kind")
    .eq("capture_set_id", captureSet.id)
    .eq("kind", "accessory");

  if (setPhotosError) {
    throw setPhotosError;
  }

  const currentEdits = await fetchCurrentEditsByPhotoIds([photo.id]);
  const edit = currentEdits.get(photo.id);

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
      accessoryEntries: [...new Set((setPhotos || []).map((item) => item.service_item_id).filter(Boolean))].map((itemId) => ({
        itemId,
        itemName: lookups.serviceItemLookup.get(itemId)?.name || itemId,
      })),
    },
    photo: {
      id: photo.id,
      kind: photo.kind,
      itemId: photo.service_item_id,
      itemName: lookups.serviceItemLookup.get(photo.service_item_id)?.name || photo.service_item_id,
      itemNote: photo.item_note || "",
      storagePath: photo.storage_path,
      fileName: photo.original_file_name,
      mimeType: photo.mime_type,
      width: photo.width,
      height: photo.height,
      createdAt: photo.created_at,
      savedFilterId: edit?.filter_id || null,
      adjustments: cloneAdjustments(edit?.adjustments || DEFAULT_ADJUSTMENTS),
    },
  };
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
