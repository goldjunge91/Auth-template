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

// Note: The validateChunkHash function has been moved to file-upload-server-helpers.ts
// to avoid duplication and ensure consistent implementation
