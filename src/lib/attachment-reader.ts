/**
 * Reads a user-selected file into an Attachment the model can actually use.
 *
 * Text-like files are decoded as UTF-8 text. Images are read as a data URL so
 * the model can view them. Word documents are unzipped and their text
 * extracted. Anything else is kept as metadata with a clear warning, rather
 * than silently pretending the model can read it.
 */

import { Attachment } from '@/lib/types';
import { extractDocxText } from '@/lib/docx';

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const TEXT_EXTENSIONS = [
  'txt', 'md', 'markdown', 'json', 'csv', 'tsv', 'yml', 'yaml',
  'xml', 'html', 'htm', 'rtf', 'log', 'srt', 'vtt',
];

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

export interface AttachmentReadResult {
  attachment: Attachment;
  /** Present when the file was attached but its contents are not readable. */
  warning?: string;
}

function extensionOf(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex === -1 ? '' : fileName.slice(dotIndex + 1).toLowerCase();
}

function isTextFile(file: File, extension: string): boolean {
  return file.type.startsWith('text/') || TEXT_EXTENSIONS.includes(extension);
}

function isImageFile(file: File, extension: string): boolean {
  return file.type.startsWith('image/') || IMAGE_EXTENSIONS.includes(extension);
}

/** The `accept` attribute shared by every attachment input in the app. */
export const ATTACHMENT_ACCEPT =
  '.txt,.md,.markdown,.json,.csv,.tsv,.yml,.yaml,.xml,.html,.rtf,.log,' +
  '.docx,.png,.jpg,.jpeg,.gif,.webp';

/** Read one file into an Attachment, or explain why it cannot be read. */
export async function readAttachmentFile(file: File): Promise<AttachmentReadResult> {
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${file.name}`;
  const extension = extensionOf(file.name);

  const base: Attachment = {
    id,
    name: file.name,
    type: file.type || extension || 'unknown',
    size: file.size,
  };

  if (file.size > MAX_ATTACHMENT_BYTES) {
    return {
      attachment: base,
      warning: `${file.name} is larger than 10 MB and was not attached.`,
    };
  }

  try {
    if (isImageFile(file, extension)) {
      const base64 = await readAsDataUrl(file);
      return { attachment: { ...base, base64 } };
    }

    if (isTextFile(file, extension)) {
      const content = await file.text();
      return { attachment: { ...base, content } };
    }

    if (extension === 'docx') {
      const buffer = await file.arrayBuffer();
      const content = await extractDocxText(buffer);
      return { attachment: { ...base, content } };
    }

    if (extension === 'pdf') {
      return {
        attachment: base,
        warning: `${file.name} was attached, but PDF text cannot be read yet. Attach a .docx or .txt version so its contents can be used.`,
      };
    }
  } catch (err: any) {
    return {
      attachment: base,
      warning: `${file.name} could not be read: ${err?.message || 'unknown error'}`,
    };
  }

  return {
    attachment: base,
    warning: `${file.name} was attached, but this file type cannot be read. Use text, Word or image files.`,
  };
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('the file could not be opened'));
    reader.readAsDataURL(file);
  });
}

/** True when the attachment carries content the model can consume. */
export function attachmentHasContent(attachment: Attachment): boolean {
  return Boolean(attachment.content?.trim() || attachment.base64);
}
