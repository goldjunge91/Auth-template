"use client";

import * as z from "zod";
import type { UploadedFile } from "@/types";
import path from "path";
import { stat, mkdir, readFile, unlink, rmdir } from "fs/promises";
import fs from 'fs';

/**
 * Defines a Zod schema for validating a single local file.
 * @param maxSizeMB The maximum allowed file size in megabytes.
 * @returns A Zod schema for file validation.
 */
export const localFileSchema = (maxSizeMB: number) =>
  z
    .custom<File>((val): val is File => val instanceof File, {
      message: "Eingabe muss ein File-Objekt sein.",
    })
    .refine((file) => file.size <= maxSizeMB * 1024 * 1024, {
      message: `Dateigröße muss kleiner als ${maxSizeMB}MB sein.`,
    });

/**
 * Processes and validates a local file, then prepares it for client-side use.
 * This simulates "saving" locally by creating necessary metadata and object URLs.
 *
 * @param file The file to process.
 * @param maxSizeMB The maximum allowed file size in megabytes. Defaults to 5MB.
 * @returns A Promise that resolves to an UploadedFile object if successful.
 * @throws An error if file validation fails.
 */
export async function processAndSaveLocalFile(
  file: File,
  maxSizeMB: number = 5,
): Promise<UploadedFile> {
  const validation = await localFileSchema(maxSizeMB).safeParseAsync(file);

  if (!validation.success) {
    const errorMessage = validation.error.errors
      .map((e) => e.message)
      .join(", ");
    throw new Error(`Dateivalidierung fehlgeschlagen: ${errorMessage}`);
  }

  const validatedFile = validation.data;
  const fileUrl = URL.createObjectURL(validatedFile);

  return {
    key: crypto.randomUUID(),
    name: validatedFile.name,
    size: validatedFile.size,
    url: fileUrl, // Diese URL kann sowohl für die Vorschau als auch für den "Download" verwendet werden
    type: validatedFile.type,
    serverData: null,
    customId: null,
    appUrl: "", // Nicht anwendbar für lokale Dateien
    ufsUrl: fileUrl, // Zur Konsistenz mit dem UploadedFile-Typ
    // Erstellt einen einfachen Hash für lokale Dateien
    fileHash: `${validatedFile.name}-${validatedFile.size}-${validatedFile.lastModified}`,
  };
}

// --- Von route.ts verschobene Funktionen ---

/**
 * Ensures that the base upload directory and its temporary subdirectory exist.
 * Creates them if they don't.
 * @returns A promise that resolves to an object containing paths to `baseUploadDir` and `tmpDir`.
 * @throws An error if directory creation fails for reasons other than non-existence.
 */
export async function ensureUploadDirsExist(): Promise<{ baseUploadDir: string; tmpDir: string }> {
  const baseUploadDir = path.join(process.cwd(), 'public', 'uploads');
  const tmpDir = path.join(baseUploadDir, 'tmp');

  for (const dir of [baseUploadDir, tmpDir]) {
    try {
      await stat(dir);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        await mkdir(dir, { recursive: true });
        console.info(`Created directory: ${dir}`);
      } else {
        console.error(`Error ensuring directory ${dir} exists:`, error);
        throw error; // Re-throw other errors
      }
    }
  }
  return { baseUploadDir, tmpDir };
}

/**
 * Validates file metadata (size and type) against defined limits.
 * @param fileSize The size of the file in bytes.
 * @param fileType The MIME type of the file.
 * @param fileName The original name of the file.
 * @param maxFileSizeBytes The maximum allowed file size in bytes.
 * @param allowedFileTypes An array of allowed MIME types.
 * @returns An error object if validation fails, otherwise null.
 */
export function validateFileMeta(
  fileSize: number,
  fileType: string | null,
  fileName: string,
  maxFileSizeBytes: number,
  allowedFileTypes: string[],
): { error?: string; details?: string; status?: number, file?: string } | null {
  if (fileSize > maxFileSizeBytes) {
    const errorDetails = `File "${fileName}" (${fileSize} bytes) is too large. Max size is ${maxFileSizeBytes / (1024 * 1024)}MB (${maxFileSizeBytes} bytes).`;
    return {
      error: "File too large",
      details: errorDetails,
      file: fileName,
      status: 413
    };
  }

  if (!fileType || !allowedFileTypes.includes(fileType)) {
    const errorDetails = `File type "${fileType}" for file "${fileName}" is not allowed. Allowed types: ${allowedFileTypes.join(", ")}`;
    return {
      error: "Unsupported file type",
      details: errorDetails,
      file: fileName,
      status: 415
    };
  }
  return null; // No error
}

// ########################
/**
 * Validates the hash of a received chunk against a provided hash.
 * @param chunkBuffer The buffer of the received chunk.
 * @param expectedHash The hash sent by the client.
 * @returns A promise that resolves to true if hashes match, false otherwise.
 */
export async function validateChunkHash(chunkBuffer: ArrayBuffer, expectedHash: string): Promise<boolean> {
  if (!expectedHash) return true; // No hash provided by client, skip validation
  try {
    const serverCalculatedHash = await crypto.subtle.digest('SHA-256', chunkBuffer);
    const serverHashHex = Buffer.from(serverCalculatedHash).toString('hex');
    return serverHashHex === expectedHash;
  } catch (error) {
    console.error("Error calculating or comparing chunk hash:", error);
    return false; // Consider hash validation failed on error
  }
}
// ########################

/**
 * Sanitizes an original filename and generates a unique filename to prevent conflicts.
 * It replaces spaces with underscores, removes disallowed characters,
 * appends a unique suffix (timestamp and random number), and preserves the file extension.
 * @param originalName The original filename from the client.
 * @returns A sanitized and unique filename.
 */
export function sanitizeAndGenerateUniqueFilename(originalName: string): string {
  const cleanedName = originalName
    .toLowerCase()
    .replace(/\\s+/g, '_') // Replace spaces with underscores
    .replace(/[^a-z0-9_\\-\\.]/g, ''); // Keep only allowed characters (alphanumeric, _, -, .)

  // Ensure extension is correctly handled, even if cleanedName loses it
  const extension = path.extname(cleanedName) || path.extname(originalName) || '';
  let baseName = path.basename(cleanedName, extension);
  if (!baseName && cleanedName.endsWith('.')) { // Handle cases like "file." -> "file"
      baseName = cleanedName.slice(0, -1);
  } else if (!baseName) { // Handle cases where basename might be empty after cleaning
      baseName = path.basename(originalName, path.extname(originalName)).toLowerCase().replace(/\\s+/g, '_').replace(/[^a-z0-9_\\-]/g, '');
  }


  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
  // Ensure the base name is not too long and the extension is correctly appended
  const finalBaseName = baseName.substring(0, 50); // Limit base name length
  return `${finalBaseName}-${uniqueSuffix}${extension}`;
}

/**
 * Assembles a file from its chunks stored in a temporary directory.
 * @param tmpDir The base temporary directory for all uploads.
 * @param uploadId The unique ID for this specific upload.
 * @param totalChunks The total number of chunks for this file.
 * @param finalFilePath The full path where the assembled file should be saved.
 * @returns A promise that resolves when the file is assembled and temporary chunks are cleaned up.
 * @throws An error if assembly or cleanup fails.
 */
export async function assembleChunks(
  tmpDir: string,
  uploadId: string,
  totalChunks: number,
  finalFilePath: string,
): Promise<void> {
  const tempUserUploadDir = path.join(tmpDir, uploadId);
  const writeStream = fs.createWriteStream(finalFilePath);

  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = path.join(tempUserUploadDir, `${i}.chunk`);
    const chunkBuffer = await readFile(chunkPath);
    writeStream.write(chunkBuffer);
    await unlink(chunkPath); // Delete chunk after appending
  }
  writeStream.end();

  // Wait for the stream to finish writing
  await new Promise<void>((resolve, reject) => {
    writeStream.on('finish', () => resolve());
    writeStream.on('error', reject);
  });

  // Clean up the temporary directory for this upload
  try {
    await rmdir(tempUserUploadDir);
    console.info(`Temporary directory ${tempUserUploadDir} deleted successfully.`);
  } catch (cleanupError: any) {
    console.warn(`Warning: Could not delete temporary directory ${tempUserUploadDir}:`, cleanupError.message);
    // Non-fatal, log and continue
  }
}
