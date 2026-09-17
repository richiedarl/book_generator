/**
 * Plain-text extraction from .docx (OOXML) files.
 *
 * A .docx is a ZIP archive; the manuscript lives in `word/document.xml`.
 * This module reads the archive's central directory, inflates that one entry
 * with the platform's DecompressionStream, and strips the markup. It is
 * deliberately self-contained so the project needs no ZIP dependency.
 */

const ZIP_END_SIGNATURE = 0x06054b50;
const ZIP_CENTRAL_SIGNATURE = 0x02014b50;
const ZIP_LOCAL_SIGNATURE = 0x04034b50;

const DOCUMENT_ENTRY = 'word/document.xml';

/** Characters used when decoding XML entities without literals in source. */
const AMPERSAND = String.fromCharCode(38);
const LESS_THAN = String.fromCharCode(60);
const GREATER_THAN = String.fromCharCode(62);
const QUOTE = String.fromCharCode(34);
const APOSTROPHE = String.fromCharCode(39);

interface ZipEntry {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  localHeaderOffset: number;
}

/**
 * Extract the document text. Paragraph and line breaks are preserved so the
 * result reads as prose rather than one long line.
 * Throws when the archive cannot be read on this platform.
 */
export async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  const view = new DataView(buffer);
  const entry = findEntry(view, DOCUMENT_ENTRY);

  if (!entry) {
    throw new Error('This .docx file does not contain a readable document part.');
  }

  const compressed = readEntryData(view, entry);

  const xmlBytes =
    entry.compressionMethod === 0 ? compressed : await inflateRaw(compressed);

  return xmlToText(new TextDecoder('utf-8').decode(xmlBytes));
}

function findEntry(view: DataView, name: string): ZipEntry | null {
  const eocdOffset = findEndOfCentralDirectory(view);
  if (eocdOffset < 0) return null;

  const entryCount = view.getUint16(eocdOffset + 10, true);
  let offset = view.getUint32(eocdOffset + 16, true);

  for (let index = 0; index < entryCount; index++) {
    if (offset + 46 > view.byteLength) return null;
    if (view.getUint32(offset, true) !== ZIP_CENTRAL_SIGNATURE) return null;

    const compressionMethod = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);

    const entryName = new TextDecoder('utf-8').decode(
      new Uint8Array(view.buffer, view.byteOffset + offset + 46, nameLength)
    );

    if (entryName === name) {
      return { name: entryName, compressionMethod, compressedSize, localHeaderOffset };
    }

    offset += 46 + nameLength + extraLength + commentLength;
  }

  return null;
}

function findEndOfCentralDirectory(view: DataView): number {
  const minimumRecordSize = 22;
  const maxComment = 0xffff;
  const lowestOffset = Math.max(0, view.byteLength - minimumRecordSize - maxComment);

  for (let offset = view.byteLength - minimumRecordSize; offset >= lowestOffset; offset--) {
    if (view.getUint32(offset, true) === ZIP_END_SIGNATURE) return offset;
  }

  return -1;
}

function readEntryData(view: DataView, entry: ZipEntry): Uint8Array {
  const headerOffset = entry.localHeaderOffset;

  if (view.getUint32(headerOffset, true) !== ZIP_LOCAL_SIGNATURE) {
    throw new Error('The .docx archive is malformed.');
  }

  const nameLength = view.getUint16(headerOffset + 26, true);
  const extraLength = view.getUint16(headerOffset + 28, true);
  const dataStart = headerOffset + 30 + nameLength + extraLength;

  return new Uint8Array(view.buffer, view.byteOffset + dataStart, entry.compressedSize);
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const DecompressionStreamCtor = (globalThis as { DecompressionStream?: unknown })
    .DecompressionStream;

  if (typeof DecompressionStreamCtor !== 'function') {
    throw new Error('This browser cannot read .docx files. Attach a .txt or .md copy instead.');
  }

  const stream = new (DecompressionStreamCtor as new (
    format: string
  ) => DecompressionStream)('deflate-raw');

  // Copy into a plainly backed buffer: the decompressor expects an
  // ArrayBuffer-backed view, while the slice above may alias a shared buffer.
  const payload = new Uint8Array(data.byteLength);
  payload.set(data);

  const writer = stream.writable.getWriter();
  writer.write(payload);
  writer.close();

  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

/**
 * Convert the document part to readable text: paragraph and break tags become
 * newlines, all other markup is removed, and XML entities are decoded.
 */
function xmlToText(xml: string): string {
  const withBreaks = xml
    .replace(/<w:tab\b[^>]*\/?>/g, ' ')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<w:br\b[^>]*\/?>/g, '\n');

  const withoutTags = withBreaks.replace(/<[^>]*>/g, '');

  return decodeXmlEntities(withoutTags)
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function decodeXmlEntities(value: string): string {
  return value
    .split(AMPERSAND + 'lt;').join(LESS_THAN)
    .split(AMPERSAND + 'gt;').join(GREATER_THAN)
    .split(AMPERSAND + 'quot;').join(QUOTE)
    .split(AMPERSAND + 'apos;').join(APOSTROPHE)
    .split(AMPERSAND + 'amp;').join(AMPERSAND)
    .replace(new RegExp(AMPERSAND + '#(\\d+);', 'g'), (match, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10)) || match
    )
    .replace(new RegExp(AMPERSAND + '#x([0-9a-fA-F]+);', 'g'), (match, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)) || match
    );
}
