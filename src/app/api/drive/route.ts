/**
 * Google Drive API Route
 *
 * Handles:
 * - GET: Returns auth URL to initiate Google Drive connection
 * - POST: Handles OAuth callback or upload request
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUrl, getTokensFromCode, uploadBook, createFolder } from "@/lib/google-drive";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "auth") {
    // Return the auth URL for the user to visit
    const authUrl = getAuthUrl();
    return NextResponse.json({ authUrl, message: "Visit this URL to authorize Google Drive access" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, code, accessToken, bookTitle, exports, images } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    if (action === "get_tokens") {
      if (!code) {
        return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
      }
      const tokens = await getTokensFromCode(code);
      return NextResponse.json({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date,
      });
    }

    if (action === "upload") {
      if (!accessToken || !bookTitle || !exports) {
        return NextResponse.json({ error: "Missing required fields for upload" }, { status: 400 });
      }

      // Convert URL-based exports to {format, filename, buffer} by fetching
      // the files from our /api/exports endpoint
      const fs = await import("fs");
      const path = await import("path");

      const exportsWithBuffer: { format: string; filename: string; buffer: Buffer }[] = [];

      for (const exp of exports) {
        // If we already have a buffer, use it directly
        if (exp.buffer) {
          const filename = exp.filename || `${exp.format}.txt`;
          exportsWithBuffer.push({ format: exp.format, filename, buffer: Buffer.from(exp.buffer, exp.encoding || "base64") });
          continue;
        }

        // Otherwise, fetch from the exports endpoint
        if (exp.url) {
          // Extract filename from the URL path
          const filename = path.basename(exp.url);
          const filePath = path.join(process.cwd(), "tmp", filename);

          try {
            const buffer = fs.readFileSync(filePath);
            exportsWithBuffer.push({ format: exp.format, filename, buffer });
          } catch (err) {
            console.error(`Failed to read export file ${filename}:`, err);
          }
        }
      }

      if (exportsWithBuffer.length === 0) {
        return NextResponse.json({ error: "No valid export files found to upload" }, { status: 400 });
      }

      const result = await uploadBook(
        bookTitle,
        exportsWithBuffer,
        images || [],
        accessToken
      );

      return NextResponse.json({
        success: true,
        bookFolderId: result.bookFolderId,
        uploadedFiles: result.files,
        uploadedImages: result.imageFiles,
        message: "Book uploaded successfully to Google Drive",
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Google Drive API error:", error);
    return NextResponse.json(
      { error: error.message || "Google Drive operation failed" },
      { status: 500 }
    );
  }
}
