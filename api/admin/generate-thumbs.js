import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.VITE_SUPABASE_STORAGE_BUCKET || "garage-originals";
const THUMB_SIZE = 600;
const DEFAULT_BATCH = 5;

function thumbPath(p) {
  return p.replace("/originals/", "/thumbs/");
}

function normalizeGroup(user) {
  const raw =
    user?.app_metadata?.group ||
    user?.app_metadata?.role ||
    user?.user_metadata?.group ||
    user?.user_metadata?.role ||
    "";
  const g = `${raw}`.trim().toLowerCase();
  return g === "supreadmin" ? "superadmin" : g;
}

async function verifyAdmin(token) {
  if (!token) return null;
  const client = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) return null;
  return normalizeGroup(user) === "superadmin" ? user : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: "Server not configured" });
  }

  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  const user = await verifyAdmin(token);
  if (!user) {
    return res.status(403).json({ error: "Superadmin only" });
  }

  const { offset = 0, limit = DEFAULT_BATCH } = req.body || {};
  const client = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // Fetch one batch of photos from DB
  const { data: photos, error: dbErr, count } = await client
    .from("photos")
    .select("id, storage_path", { count: "exact" })
    .not("storage_path", "is", null)
    .like("storage_path", "%/originals/%")
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (dbErr) return res.status(500).json({ error: dbErr.message });

  const total = count ?? 0;
  let created = 0, skipped = 0, failed = 0;
  const errors = [];

  for (const photo of photos || []) {
    const tPath = thumbPath(photo.storage_path);
    try {
      const { data: fileData, error: dlErr } = await client.storage
        .from(BUCKET)
        .download(photo.storage_path);
      if (dlErr) throw new Error(`download: ${dlErr.message}`);

      const original = Buffer.from(await fileData.arrayBuffer());
      const thumb = await sharp(original)
        .resize(THUMB_SIZE, THUMB_SIZE, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 78 })
        .toBuffer();

      const { error: upErr } = await client.storage
        .from(BUCKET)
        .upload(tPath, thumb, {
          contentType: "image/jpeg",
          cacheControl: "86400",
          upsert: false,
        });

      if (!upErr) {
        created++;
      } else if (
        upErr.message?.toLowerCase().includes("already exists") ||
        upErr.statusCode === "409" ||
        upErr.statusCode === 409
      ) {
        skipped++;
      } else {
        throw new Error(`upload: ${upErr.message}`);
      }
    } catch (err) {
      failed++;
      errors.push({ path: photo.storage_path, error: err.message });
      console.error("thumb error:", photo.storage_path, err.message);
    }
  }

  const processed = photos?.length ?? 0;
  const nextOffset = offset + processed;

  return res.status(200).json({
    created,
    skipped,
    failed,
    errors,
    processed,
    total,
    nextOffset,
    done: nextOffset >= total,
  });
}
