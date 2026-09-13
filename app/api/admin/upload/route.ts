import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { createAuditLog } from "@/lib/db/audit";
import { getAuthSession } from "@/lib/auth/rbac";

export async function POST(request: NextRequest) {
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

      originalName = file.name;
      originalSize = file.size;
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } 
    // Handle JSON Base64 or Image URL payload
    else if (contentType.includes("application/json")) {
      const body = await request.json();
      
      if (body.base64) {
        const base64Data = body.base64.replace(/^data:image\/\w+;base64,/, "");
        buffer = Buffer.from(base64Data, "base64");
        originalName = body.filename || "base64-image";
        originalSize = buffer.length;
      } else if (body.imageUrl) {
        // Fetch external image URL and convert to WebP
        const imageRes = await fetch(body.imageUrl);
        if (!imageRes.ok) {
          return NextResponse.json({ error: "Failed to fetch image from provided URL." }, { status: 400 });
        }
        const arrayBuffer = await imageRes.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        originalName = path.basename(body.imageUrl) || "url-image";
        originalSize = buffer.length;
      }
    }

    if (!buffer) {
      return NextResponse.json({ error: "Invalid upload request. File or base64 image required." }, { status: 400 });
    }

    // Process & Convert Image to WebP using Sharp
    const webpBuffer = await sharp(buffer)
      .rotate() // Auto-orient based on EXIF metadata
      .webp({ quality: 85, effort: 6 }) // Convert to WebP with optimal compression
      .toBuffer();

    const convertedSize = webpBuffer.length;
    const savingsPercent = originalSize > 0 
      ? Math.round(((originalSize - convertedSize) / originalSize) * 100)
      : 0;

    // Save WebP File to public/uploads
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });

    const cleanBaseName = path.parse(originalName).name.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30);
    const filename = `${cleanBaseName}-${Date.now()}-${uuidv4().substring(0, 6)}.webp`;
    const filePath = path.join(uploadsDir, filename);

    await fs.writeFile(filePath, webpBuffer);

    const publicUrl = `/uploads/${filename}`;

    // Audit Logging
    createAuditLog({
      userId: session?.userId || "usr-admin",
      userName: session?.email || "Admin User",
      userRole: session?.role || "admin",
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
    return NextResponse.json({ 
      error: err.message || "Failed to process and convert image to WebP." 
    }, { status: 500 });
  }
}
