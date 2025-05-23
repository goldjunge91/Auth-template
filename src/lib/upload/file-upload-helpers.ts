"use client";

import * as z from "zod";
import type { UploadedFile } from "@/types";
import path from "node:path";
import { fileUploadResponseSchema } from "@/lib/upload/schemas/file-upload-schemas";

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
  const fileKey = crypto.randomUUID();

  // Erstelle ein Objekt, das dem Schema entspricht
  const uploadedFile = fileUploadResponseSchema.parse({
    success: true,
    message: "File processed locally",
    filename: validatedFile.name,
    fileUrl: fileUrl,
    fileName: validatedFile.name,
    url: fileUrl,
    serverData: null,
    customId: null,
    appUrl: "",
    ufsUrl: fileUrl,
    fileHash: `${validatedFile.name}-${validatedFile.size}-${validatedFile.lastModified}`,
  });

  return {
    key: fileKey,
    name: uploadedFile.fileName ?? validatedFile.name,
    size: validatedFile.size,
    url: uploadedFile.fileUrl ?? "",
    type: validatedFile.type,
    serverData: uploadedFile.serverData,
    customId: uploadedFile.customId ?? null,
    appUrl: uploadedFile.appUrl ?? "",
    ufsUrl: uploadedFile.ufsUrl ?? "",
    fileHash: uploadedFile.fileHash ?? "",
  };
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
