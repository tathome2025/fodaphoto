/**
 * generate_thumbs.mjs
 *
 * Backfill thumbnails for existing photos that were uploaded before the
 * automatic thumbnail generation was added.
 *
 * Usage:
 *   node scripts/generate_thumbs.mjs
 *
 * Requirements:
 *   - SUPABASE_SERVICE_ROLE_KEY must be set in .env (or as env var)
 *   - npm install sharp  (run once before first use)
 *
 * The script is idempotent — safe to re-run; already-existing thumbs are skipped.
 */

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ─── Config ──────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const THUMB_SIZE = 600;
const CONCURRENCY = 4; // parallel uploads at a time
const JPEG_QUALITY = 78;

// ─── Load .env ────────────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = resolve(ROOT, ".env");
  if (!existsSync(envPath)) return {};
  return Object.fromEntries(
    readFileSync(envPath, "utf-8")
      .split("\n")
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => {
        const [k, ...rest] = l.split("=");
        return [k.trim(), rest.join("=").trim().replace(/^['"]|['"]$/g, "")];
      })
  );
}

const env = { ...loadEnv(), ...process.env };

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = env.VITE_SUPABASE_STORAGE_BUCKET || "garage-originals";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌  Missing required env vars:");
  if (!SUPABASE_URL) console.error("   VITE_SUPABASE_URL");
  if (!SERVICE_KEY)  console.error("   SUPABASE_SERVICE_ROLE_KEY");
  console.error("\nAdd them to your .env file and try again.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function thumbPath(originalPath) {
  return originalPath.replace("/originals/", "/thumbs/");
}

async function checkThumbExists(tPath) {
  // Try a quick signed URL — if the file doesn't exist Supabase still
  // generates a URL but the HEAD request fails. Instead, use list().
  const folder = tPath.split("/").slice(0, -1).join("/");
  const name   = tPath.split("/").pop();
  const { data } = await supabase.storage.from(BUCKET).list(folder, {
    limit: 1,
    search: name,
  });
  return (data || []).some((f) => f.name === name);
}

async function processPhoto(storagePath, label) {
  const tPath = thumbPath(storagePath);

  // Skip if thumb already exists
  const exists = await checkThumbExists(tPath);
  if (exists) return "skipped";

  // Download original
  const { data: fileData, error: dlErr } = await supabase.storage
    .from(BUCKET)
    .download(storagePath);
  if (dlErr) throw new Error(`download: ${dlErr.message}`);

  // Resize with sharp
  const original = Buffer.from(await fileData.arrayBuffer());
  const thumb = await sharp(original)
    .resize(THUMB_SIZE, THUMB_SIZE, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();

  // Upload thumbnail
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(tPath, thumb, {
      contentType: "image/jpeg",
      cacheControl: "86400",
      upsert: false,
    });

  if (upErr && upErr.message?.includes("already exists")) return "skipped";
  if (upErr) throw new Error(`upload: ${upErr.message}`);

  return "created";
}

// Run tasks with a concurrency limit
async function withConcurrency(tasks, limit) {
  const results = [];
  let index = 0;
  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔍  Fetching photo list from database…");

  const { data: photos, error } = await supabase
    .from("photos")
    .select("id, storage_path")
    .not("storage_path", "is", null)
    .like("storage_path", "%/originals/%");

  if (error) {
    console.error("❌  DB query failed:", error.message);
    process.exit(1);
  }

  const eligible = (photos || []).filter((p) => p.storage_path);
  console.log(`📸  ${eligible.length} photos found\n`);

  if (!eligible.length) {
    console.log("Nothing to do.");
    return;
  }

  let created = 0, skipped = 0, failed = 0;
  const total = eligible.length;

  const tasks = eligible.map((photo, i) => async () => {
    const label = `[${String(i + 1).padStart(String(total).length)}/${total}]`;
    const name = photo.storage_path.split("/").pop();
    try {
      const result = await processPhoto(photo.storage_path, label);
      if (result === "created") {
        created++;
        console.log(`${label} ✅  ${name}`);
      } else {
        skipped++;
        console.log(`${label} ⏭️   ${name} (already exists)`);
      }
    } catch (err) {
      failed++;
      console.error(`${label} ❌  ${name} — ${err.message}`);
    }
  });

  await withConcurrency(tasks, CONCURRENCY);

  console.log("\n─────────────────────────────────────");
  console.log(`✅  Created : ${created}`);
  console.log(`⏭️   Skipped : ${skipped}`);
  console.log(`❌  Failed  : ${failed}`);
  console.log(`📦  Total   : ${total}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
