import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const UPLOADS_ROOT = path.resolve(process.cwd(), "uploads", "listings");

interface UploadResult {
  url: string;
  thumbnail: string;
  card: string;
  full: string;
}

const VARIANTS = [
  { suffix: "-thumb", width: 200, quality: 70 },
  { suffix: "-card", width: 600, quality: 80 },
  { suffix: "", width: 1400, quality: 85 },
] as const;

function sanitizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9.-]/g, "-");
}

function getExtension(originalName: string, contentType: string): string {
  const fromName = originalName.split(".").pop()?.trim().toLowerCase();
  if (fromName && fromName.length <= 8) return fromName;
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

export async function uploadImage(
  buffer: Buffer,
  originalName: string,
  contentType: string
): Promise<UploadResult> {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const ext = getExtension(originalName, contentType);
  const baseName = `${randomUUID()}-${sanitizeName(originalName || "car-image")}`;
  const relDir = `${yyyy}/${mm}`;
  const absDir = path.join(UPLOADS_ROOT, relDir);

  await fs.mkdir(absDir, { recursive: true });

  const results: { url: string; thumbnail: string; card: string; full: string } = {
    url: "",
    thumbnail: "",
    card: "",
    full: "",
  };

  for (const variant of VARIANTS) {
    const fileName = `${baseName}${variant.suffix}.jpg`;
    const absPath = path.join(absDir, fileName);
    const relUrl = `/uploads/listings/${relDir}/${fileName}`;

    await sharp(buffer)
      .resize(variant.width, undefined, { withoutEnlargement: true })
      .jpeg({ quality: variant.quality })
      .toFile(absPath);

    if (variant.suffix === "") {
      results.full = relUrl;
      results.url = relUrl;
    } else if (variant.suffix === "-thumb") {
      results.thumbnail = relUrl;
    } else if (variant.suffix === "-card") {
      results.card = relUrl;
    }
  }

  return results;
}
