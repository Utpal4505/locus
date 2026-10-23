import type { LibraryNoteItem } from "@locus/contracts";

/**
 * Computes standard 32-bit Cyclic Redundancy Check (CRC32) for ZIP file entry validation.
 */
function computeCrc32(data: Uint8Array): number {
  let crc = -1;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i]!;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ -1) >>> 0;
}

/**
 * Sanitizes a title string into a safe file basename across OS filesystems.
 */
export function sanitizeFilename(title: string, maxLength = 60): string {
  const sanitized = title
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return (sanitized || "video-note").slice(0, maxLength);
}

/**
 * Formats seconds into HH:MM:SS or MM:SS duration string.
 */
function formatSeconds(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return "Unknown";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Formats a note into an Obsidian/Notion-compatible Markdown file with YAML frontmatter.
 */
export function formatNoteAsMarkdown(note: LibraryNoteItem): string {
  const duration = formatSeconds(note.durationSeconds);
  const formattedDate = note.updatedAt ? new Date(note.updatedAt).toISOString() : new Date().toISOString();
  const videoUrl = note.url || `https://www.youtube.com/watch?v=${note.youtubeVideoId}`;

  return `---
title: "${note.videoTitle.replace(/"/g, '\\"')}"
channel: "${note.channelName.replace(/"/g, '\\"')}"
video_url: "${videoUrl}"
duration: "${duration}"
updated_at: "${formattedDate}"
tags:
  - locus
  - video-notes
---

# ${note.videoTitle}

- **Creator:** ${note.channelName}
- **Duration:** ${duration}
- **Original Video:** [Watch on YouTube](${videoUrl})
- **Last Updated:** ${new Date(formattedDate).toLocaleDateString()}

---

${note.content}
`;
}

/**
 * Triggers a client-side file download via a Blob URL.
 */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Downloads a single note as a `.md` file.
 */
export function downloadSingleNote(note: LibraryNoteItem): void {
  const markdown = formatNoteAsMarkdown(note);
  const filename = `${sanitizeFilename(note.videoTitle)}-notes.md`;
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  triggerDownload(blob, filename);
}

/**
 * Generates and downloads a valid uncompressed standard PKZip archive containing
 * all notes formatted as individual `.md` files. Zero external dependencies required.
 */
export function downloadNotesAsZip(
  notes: LibraryNoteItem[],
  zipFilename = "locus-notes-export.zip",
): void {
  if (notes.length === 0) return;

  const encoder = new TextEncoder();
  const fileRecords: Array<{
    filenameBytes: Uint8Array;
    dataBytes: Uint8Array;
    crc: number;
    offset: number;
  }> = [];

  let currentOffset = 0;
  const parts: Uint8Array[] = [];

  // Track filenames to avoid duplicates in the ZIP archive
  const usedNames = new Set<string>();

  for (const note of notes) {
    const rawName = `${sanitizeFilename(note.videoTitle)}-notes.md`;
    let filename = rawName;
    let counter = 2;
    while (usedNames.has(filename)) {
      filename = `${sanitizeFilename(note.videoTitle)}-${counter}-notes.md`;
      counter++;
    }
    usedNames.add(filename);

    const markdown = formatNoteAsMarkdown(note);
    const filenameBytes = encoder.encode(filename);
    const dataBytes = encoder.encode(markdown);
    const crc = computeCrc32(dataBytes);

    // 1. Local File Header (30 bytes + filename + data)
    const localHeader = new Uint8Array(30 + filenameBytes.length);
    const view = new DataView(localHeader.buffer);

    view.setUint32(0, 0x04034b50, true); // Local file header signature
    view.setUint16(4, 20, true); // Version needed to extract (2.0)
    view.setUint16(6, 0x0800, true); // General purpose bit flag (UTF-8 filename)
    view.setUint16(8, 0, true); // Compression method (0 = STORED / uncompressed)
    view.setUint16(10, 0, true); // File mod time
    view.setUint16(12, 0, true); // File mod date
    view.setUint32(14, crc, true); // CRC32
    view.setUint32(18, dataBytes.length, true); // Compressed size
    view.setUint32(22, dataBytes.length, true); // Uncompressed size
    view.setUint16(26, filenameBytes.length, true); // Filename length
    view.setUint16(28, 0, true); // Extra field length
    localHeader.set(filenameBytes, 30);

    fileRecords.push({
      filenameBytes,
      dataBytes,
      crc,
      offset: currentOffset,
    });

    parts.push(localHeader);
    parts.push(dataBytes);
    currentOffset += localHeader.length + dataBytes.length;
  }

  // 2. Central Directory
  const centralDirStart = currentOffset;
  for (const rec of fileRecords) {
    const cdHeader = new Uint8Array(46 + rec.filenameBytes.length);
    const view = new DataView(cdHeader.buffer);

    view.setUint32(0, 0x02014b50, true); // Central file header signature
    view.setUint16(4, 20, true); // Version made by
    view.setUint16(6, 20, true); // Version needed to extract
    view.setUint16(8, 0x0800, true); // General purpose bit flag (UTF-8)
    view.setUint16(10, 0, true); // Compression method (STORED)
    view.setUint16(12, 0, true); // File mod time
    view.setUint16(14, 0, true); // File mod date
    view.setUint32(16, rec.crc, true); // CRC32
    view.setUint32(20, rec.dataBytes.length, true); // Compressed size
    view.setUint32(24, rec.dataBytes.length, true); // Uncompressed size
    view.setUint16(28, rec.filenameBytes.length, true); // Filename length
    view.setUint16(30, 0, true); // Extra field length
    view.setUint16(32, 0, true); // Comment length
    view.setUint16(34, 0, true); // Disk start
    view.setUint16(36, 0, true); // Internal attributes
    view.setUint32(38, 0x81a40000, true); // External attributes (regular file rw-r--r--)
    view.setUint32(42, rec.offset, true); // Relative offset of local header
    cdHeader.set(rec.filenameBytes, 46);

    parts.push(cdHeader);
    currentOffset += cdHeader.length;
  }
  const centralDirSize = currentOffset - centralDirStart;

  // 3. End of Central Directory Record (EOCD - 22 bytes)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);

  eocdView.setUint32(0, 0x06054b50, true); // EOCD signature
  eocdView.setUint16(4, 0, true); // Disk number
  eocdView.setUint16(6, 0, true); // Disk with central directory
  eocdView.setUint16(8, fileRecords.length, true); // Central directory records on this disk
  eocdView.setUint16(10, fileRecords.length, true); // Total central directory records
  eocdView.setUint32(12, centralDirSize, true); // Size of central directory
  eocdView.setUint32(16, centralDirStart, true); // Offset of start of central directory
  eocdView.setUint16(20, 0, true); // Comment length

  parts.push(eocd);

  // Combine and trigger download
  const blob = new Blob(parts as BlobPart[], { type: "application/zip" });
  triggerDownload(blob, zipFilename);
}
