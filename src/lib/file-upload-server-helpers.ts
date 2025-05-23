import path from "path";
import { stat, mkdir, readFile, unlink, rmdir, access, constants } from "fs/promises";
import fs from 'fs';
import { Buffer } from 'buffer'; // Required for Buffer.from with crypto.subtle.digest result

// --- Functions moved from file-upload-helpers.ts ---

/**
 * Ensures that the base upload directory and its temporary subdirectory exist.
 * Creates them if they don\'t.
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

/**
 * Validiert einen Chunk-Hash gegen den vom Client gesendeten Hash
 */
export async function validateChunkHash(chunkBuffer: ArrayBuffer, clientHash: string): Promise<boolean> {
  try {
    if (!clientHash) return true; // Wenn kein Hash gesendet wurde, überspringen wir die Validierung
    
    const serverHash = await crypto.subtle.digest('SHA-256', chunkBuffer);
    const serverHashHex = Buffer.from(serverHash).toString('hex');
    
    return serverHashHex === clientHash;
  } catch (error) {
    console.error("Error validating chunk hash:", error);
    return false; // Bei Fehlern schlägt die Validierung fehl
  }
}

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
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/[^a-z0-9_\-\.]/g, ''); // Keep only allowed characters (alphanumeric, _, -, .)

  const extension = path.extname(cleanedName) || path.extname(originalName) || '';
  let baseName = path.basename(cleanedName, extension);
  if (!baseName && cleanedName.endsWith('.')) {
      baseName = cleanedName.slice(0, -1);
  } else if (!baseName) {
      baseName = path.basename(originalName, path.extname(originalName)).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\-]/g, '');
  }

  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
  const finalBaseName = baseName.substring(0, 50);
  return `${finalBaseName}-${uniqueSuffix}${extension}`;
}

/**
 * Fügt alle Chunks zu einer vollständigen Datei zusammen
 */
export async function assembleChunks(
  baseTmpDir: string,
  uploadId: string,
  totalChunks: number,
  finalFilePath: string
): Promise<boolean> {
  const chunkDir = path.join(baseTmpDir, uploadId);
  
  try {
    console.log(`Assembling ${totalChunks} chunks from ${chunkDir} to ${finalFilePath}`);
    
    // Stelle sicher, dass das Zielverzeichnis existiert
    const finalDir = path.dirname(finalFilePath);
    await mkdir(finalDir, { recursive: true });
    
    // Öffne die Zieldatei zum Schreiben
    const writeStream = fs.createWriteStream(finalFilePath);
    
    // Verarbeite jeden Chunk in der richtigen Reihenfolge
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(chunkDir, `chunk-${i}.tmp`);
      
      try {
        // Prüfe, ob der Chunk existiert
        await access(chunkPath, constants.F_OK);
      } catch (error) {
        console.error(`Chunk ${i} not found at ${chunkPath}`);
        writeStream.end();
        return false;
      }
      
      // Lese den Chunk und schreibe ihn in die Zieldatei
      const chunkData = await fs.promises.readFile(chunkPath);
      writeStream.write(chunkData);
    }
    
    // Schließe den Stream und warte auf Abschluss
    await new Promise<void>((resolve, reject) => {
      writeStream.end();
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
    
    // Lösche das temporäre Verzeichnis nach erfolgreicher Zusammenführung
    try {
      // Lösche alle Chunk-Dateien
      for (let i = 0; i < totalChunks; i++) {
        const chunkPath = path.join(chunkDir, `chunk-${i}.tmp`);
        await unlink(chunkPath);
      }
      
      // Lösche das Verzeichnis
      await rmdir(chunkDir);
      console.log(`Temporary directory ${chunkDir} deleted successfully.`);
    } catch (cleanupError) {
      console.warn(`Warning: Could not clean up temporary directory ${chunkDir}:`, cleanupError);
      // Wir werfen hier keinen Fehler, da die Datei bereits erfolgreich zusammengeführt wurde
    }
    
    console.log(`File assembled successfully at ${finalFilePath}`);
    return true;
  } catch (error) {
    console.error(`Error assembling chunks: ${error}`);
    return false;
  }
}
