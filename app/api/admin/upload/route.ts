import { NextRequest, NextResponse } from "next/server";
import path from "path";
import sharp from "sharp";
import { randomBytes } from "node:crypto";
import { upsertDoc } from "@/lib/db/store";
import { fetchPublicImage } from "@/lib/security/safe-fetch";

const MAX_BYTES = 8 * 1024 * 1024;
import { createAuditLog } from "@/lib/db/audit";
import { getAuthSession } from "@/lib/auth/rbac";
import { guarded } from "@/lib/auth/guard";

async function handlePOST(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    const contentType = request.headers.get("content-type") || "";

    let buffer: Buffer | null = null;
    let originalName = "uploaded-image";
    let originalSize = 0;

    // Handle Multipart Form Data Upload
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "No image file provided in formData." }, { status: 400 });
      }

      if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image is too large (max 8 MB)." }, { status: 413 });
      originalName = file.name;
      originalSize = file.size;
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } 
    // Handle JSON Base64 or Image URL payload
    else if (contentType.includes("application/json")) {
      const body = await request.json();
      
      if (body.base64) {
        if (typeof body.base64 !== "string" || body.base64.length > MAX_BYTES * 1.4) return NextResponse.json({ error: "Image is too large (max 8 MB)." }, { status: 413 });
        const base64Data = body.base64.replace(/^data:image\/\w+;base64,/, "");
        buffer = Buffer.from(base64Data, "base64");
        originalName = body.filename || "base64-image";
        originalSize = buffer.length;
      } else if (body.imageUrl) {
        // Fetch external image URL and convert to WebP
        try {
          buffer = await fetchPublicImage(String(body.imageUrl), MAX_BYTES);
        } catch (e: any) {
          return NextResponse.json({ error: e?.message || "Failed to fetch image from provided URL." }, { status: 400 });
        }
        originalName = path.basename(new URL(body.imageUrl).pathname) || "url-image";
        originalSize = buffer.length;
      }
    }

    if (!buffer) {
      return NextResponse.json({ error: "Invalid upload request. File or base64 image required." }, { status: 400 });
    }

    // Process & Convert Image to WebP using Sharp
    const webpBuffer = await sharp(buffer, { limitInputPixels: 60_000_000, failOn: "error" })
      .rotate() // Auto-orient based on EXIF metadata
      .webp({ quality: 85, effort: 6 }) // Convert to WebP with optimal compression
      .toBuffer();

    const convertedSize = webpBuffer.length;
    const savingsPercent = originalSize > 0 
      ? Math.round(((originalSize - convertedSize) / originalSize) * 100)
      : 0;

    // Stored in Postgres (works on read-only / serverless hosts) and served from /uploads/<file>.
    const cleanBaseName = path.parse(originalName).name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 30) || "image";
    const filename = `${cleanBaseName}-${Date.now()}-${randomBytes(3).toString("hex")}.webp`;
    await upsertDoc("media", { id: filename, mime: "image/webp", data: webpBuffer.toString("base64"), size: webpBuffer.length, createdAt: new Date().toISOString() });

    const publicUrl = `/uploads/${filename}`;

    // Audit Logging
    await createAuditLog({
      userId: session?.userId,
      userName: session?.email,
      userRole: session?.role,
      action: "CONVERT_AND_UPLOAD_WEBP_IMAGE",
      module: "products",
      recordId: filename,
      recordName: originalName,
      updatedData: { publicUrl, originalSize, convertedSize, savingsPercent },
      status: "success",
      riskLevel: "LOW"
    });

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
      originalName,
      format: "webp",
      originalSize,
      convertedSize,
      savingsPercent: `${savingsPercent}%`
    }, { status: 201 });

  } catch (err: any) {
    console.error("WebP Image Conversion Error:", err);
    return NextResponse.json({ error: "Could not process that image. Please upload a valid JPG, PNG or WebP." }, { status: 400 });
  }
}

export const POST = guarded(handlePOST);
