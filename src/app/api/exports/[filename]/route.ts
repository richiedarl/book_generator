import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const tempDir = path.join(process.cwd(), "tmp");
  const filePath = path.join(tempDir, filename);

  // Prevent path traversal
  if (!filename || filename.includes("..") || filename.includes("/")) {
    return new NextResponse("Invalid filename", { status: 400 });
  }

  try {
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filename).toLowerCase();

    let contentType = "application/octet-stream";
    switch (ext) {
      case ".epub":
        contentType = "application/epub+zip";
        break;
      case ".pdf":
        contentType = "application/pdf";
        break;
      case ".docx":
        contentType =
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        break;
      case ".png":
        contentType = "image/png";
        break;
      case ".jpg":
      case ".jpeg":
        contentType = "image/jpeg";
        break;
    }

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return new NextResponse("File not found", { status: 404 });
    }
    return new NextResponse("Internal server error", { status: 500 });
  }
}
