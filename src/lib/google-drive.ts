/**
 * Google Drive Integration
 *
 * Handles authentication via OAuth2 and uploads of generated book files.
 * All API credentials are kept server-side and never exposed to the browser.
 */

import { google } from "googleapis";
import { JWT } from "google-auth-library";
import * as fs from "fs";
import * as path from "path";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

// OAuth2 client setup
// The callback URL this app handles
const DRIVE_CALLBACK_URL = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/drive/callback`;

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    DRIVE_CALLBACK_URL
  );
}

// Generate auth URL for the user to visit.
// Google will redirect back to /api/drive/callback with the auth code.
export function getAuthUrl(): string {
  const oauth2Client = getOAuth2Client();

  const scopes = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive.appdata",
  ];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    redirect_uri: DRIVE_CALLBACK_URL,
  });
}

// Exchange code for tokens
export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Create folder on Google Drive
export async function createFolder(
  folderName: string,
  parentFolderId: string | null = null,
  accessToken: string
): Promise<string> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: "v3", auth: oauth2Client });

  const folderMetadata: any = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
  };

  if (parentFolderId) {
    folderMetadata.parents = [parentFolderId];
  }

  const response = await drive.files.create({
    requestBody: folderMetadata,
    fields: "id",
  });

  return response.data.id!;
}

// Upload a file to Google Drive
export async function uploadFile(
  fileName: string,
  fileBuffer: Buffer,
  mimeType: string,
  folderId: string,
  accessToken: string
): Promise<string> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: "v3", auth: oauth2Client });

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Buffer.from(fileBuffer),
    },
    fields: "id, webViewLink",
  });

  return response.data.id!;
}

// Create the full folder structure for a book
export async function createBookFolderStructure(
  bookTitle: string,
  accessToken: string
): Promise<{
  bookFolderId: string;
  originalFolderId: string;
  imagesFolderId: string;
  finalFolderId: string;
}> {
  // Find or create the "The Shelf" root folder
  let shelfFolderId = await findFolder("The Shelf", null, accessToken);
  if (!shelfFolderId) {
    shelfFolderId = await createFolder("The Shelf", null, accessToken);
  }

  // Find or create "Books" folder under The Shelf
  let booksFolderId = await findFolder("Books", shelfFolderId, accessToken);
  if (!booksFolderId) {
    booksFolderId = await createFolder("Books", shelfFolderId, accessToken);
  }

  // Create book-specific folder
  const bookFolderId = await createFolder(bookTitle, booksFolderId, accessToken);

  // Create subfolders
  const originalFolderId = await createFolder("Original", bookFolderId, accessToken);
  const imagesFolderId = await createFolder("Images", bookFolderId, accessToken);
  const finalFolderId = await createFolder("Final", bookFolderId, accessToken);

  return {
    bookFolderId,
    originalFolderId,
    imagesFolderId,
    finalFolderId,
  };
}

// Find a folder by name in a parent folder
export async function findFolder(
  folderName: string,
  parentFolderId: string | null,
  accessToken: string
): Promise<string | null> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: "v3", auth: oauth2Client });

  let q = `mimeType='application/vnd.google-apps.folder' and name='${folderName.replace(/'/g, "\\'")}' and trashed=false`;
  if (parentFolderId) {
    q += ` and '${parentFolderId}' in parents`;
  }

  const response = await drive.files.list({
    q,
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id!;
  }

  return null;
}

// Upload a complete book to Google Drive
export async function uploadBook(
  bookTitle: string,
  exports: { format: string; filename: string; buffer: Buffer }[],
  images: { id: string; filename: string; buffer: Buffer; mimeType: string }[],
  accessToken: string
): Promise<{
  bookFolderId: string;
  files: { format: string; fileId: string; webViewLink: string }[];
  imageFiles: { imageId: string; fileId: string }[];
}> {
  const folders = await createBookFolderStructure(bookTitle, accessToken);

  const uploadedFiles: { format: string; fileId: string; webViewLink: string }[] = [];
  const uploadedImages: { imageId: string; fileId: string }[] = [];

  // Upload exported book files to Final folder
  for (const exp of exports) {
    let mimeType = "application/octet-stream";
    if (exp.format === "epub") mimeType = "application/epub+zip";
    if (exp.format === "pdf") mimeType = "application/pdf";
    if (exp.format === "docx") mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    const fileId = await uploadFile(exp.filename, exp.buffer, mimeType, folders.finalFolderId, accessToken);
    uploadedFiles.push({
      format: exp.format,
      fileId,
      webViewLink: `https://drive.google.com/file/d/${fileId}/view`,
    });
  }

  // Upload images to Images folder
  for (const img of images) {
    const fileId = await uploadFile(img.filename, img.buffer, img.mimeType, folders.imagesFolderId, accessToken);
    uploadedImages.push({ imageId: img.id, fileId });
  }

  return {
    bookFolderId: folders.bookFolderId,
    files: uploadedFiles,
    imageFiles: uploadedImages,
  };
}

// Refresh OAuth token
export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  try {
    const { token } = await oauth2Client.getAccessToken();
    return token;
  } catch (err) {
    console.error("Failed to refresh access token:", err);
    return null;
  }
}
