import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

// In-memory store for images (in production, use a proper storage backend)
const imageStore = new Map<string, { data: string; mimeType: string }>();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const image = imageStore.get(id);
  if (!image) {
    return new NextResponse("Image not found", { status: 404 });
  }

  const buffer = Buffer.from(image.data, "base64");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": image.mimeType,
      "Content-Disposition": `inline; filename="${id}"`,
    },
  });
}

export function storeImage(id: string, base64Data: string, mimeType: string) {
  imageStore.set(id, { data: base64Data, mimeType });
}

export function getImage(id: string): { data: string; mimeType: string } | null {
  return imageStore.get(id) ?? null;
}
