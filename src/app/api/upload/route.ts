import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { writeFile, access, constants, unlink, mkdir, rmdir } from "fs/promises";
import fs from "fs";
import {
  ensureUploadDirsExist,
  validateFileMeta,
  sanitizeAndGenerateUniqueFilename,
  assembleChunks,
  validateChunkHash, // ######################## Import validateChunkHash ########################
} from "@/lib/file-upload-helpers";
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from "@/config/file-upload-config";

export async function POST(request: NextRequest) {
  console.log("POST /api/upload called");
  await ensureUploadDirsExist();

  const formData = await request.formData();
  const chunk = formData.get("chunk") as File | null; // Changed from 'file' to 'chunk' for clarity

  if (!chunk) {
    console.error("No chunk found in formData");
    return NextResponse.json({ success: false, error: "No chunk uploaded" }, { status: 400 });
  }

  const uploadId = request.headers.get("X-Upload-ID");
  const chunkIndexStr = request.headers.get("X-Chunk-Index");
  const totalChunksStr = request.headers.get("X-Total-Chunks");
  const originalFilename = request.headers.get("X-Original-Filename");
  const fileTypeFromHeader = request.headers.get("X-File-Type");
  const fileSizeStr = request.headers.get("X-File-Size");
  // ######################## START: Read Chunk Hash Header ########################
  const clientChunkHash = request.headers.get("X-Chunk-Hash");
  // ######################## END: Read Chunk Hash Header ########################

  // If headers for chunking are present, handle as a chunk
  if (uploadId && chunkIndexStr && totalChunksStr && originalFilename && fileTypeFromHeader && fileSizeStr) {
    console.log(`Received chunk for uploadId: ${uploadId}`);
    const chunkIndex = parseInt(chunkIndexStr, 10);
    const totalChunks = parseInt(totalChunksStr, 10);
    const fileSize = parseInt(fileSizeStr, 10);

    // Validate file metadata for the first chunk
    if (chunkIndex === 0) {
      const validationError = validateFileMeta(
        fileSize,
        fileTypeFromHeader,
        originalFilename,
        MAX_FILE_SIZE,
        ALLOWED_FILE_TYPES
      );
      if (validationError) {
        console.error(`File metadata validation failed for ${originalFilename}: ${validationError.details}`);
        return NextResponse.json({ success: false, error: validationError.error, details: validationError.details, file: validationError.file }, { status: validationError.status });
      }
      console.log(`File metadata validated for ${originalFilename}`);
    }

    const chunkDir = path.join(process.cwd(), "public", "uploads", "tmp", uploadId);
    try {
      await access(chunkDir);
    } catch (e) {
      await mkdir(chunkDir, { recursive: true });
      console.log(`Created temporary directory: ${chunkDir}`);
    }

    const chunkFilePath = path.join(chunkDir, `chunk-${chunkIndex}.tmp`);
    const chunkBuffer = await chunk.arrayBuffer();

    // ######################## START: Validate Chunk Hash ########################
    if (clientChunkHash) {
      console.log(`Client chunk hash for chunk ${chunkIndex}: ${clientChunkHash}`);
      const isHashValid = await validateChunkHash(chunkBuffer, clientChunkHash);
      if (!isHashValid) {
        console.error(`Chunk hash validation failed for ${originalFilename}, chunk ${chunkIndex}`);
        // Optionally, delete the invalid chunk
        try {
          await unlink(chunkFilePath);
          console.log(`Deleted invalid chunk: ${chunkFilePath}`);
        } catch (unlinkError) {
          console.error(`Error deleting invalid chunk ${chunkFilePath}: ${unlinkError}`);
        }
        return NextResponse.json({ success: false, error: "Chunk integrity check failed" }, { status: 400 });
      }
      console.log(`Chunk hash validated for ${originalFilename}, chunk ${chunkIndex}`);
    } else {
      console.log(`No X-Chunk-Hash header present for chunk ${chunkIndex}. Skipping hash validation.`);
    }
    // ######################## END: Validate Chunk Hash ########################

    try {
      await writeFile(chunkFilePath, Buffer.from(chunkBuffer));
      console.log(`Saved chunk ${chunkIndex} to ${chunkFilePath}`);

      if (chunkIndex === totalChunks - 1) {
        console.log(`Received last chunk for ${originalFilename}. Assembling file...`);
        const finalFilename = sanitizeAndGenerateUniqueFilename(originalFilename);
        const finalFilePath = path.join(process.cwd(), "public", "uploads", finalFilename);
        const baseTmpDir = path.join(process.cwd(), "public", "uploads", "tmp");

        await assembleChunks(baseTmpDir, uploadId, totalChunks, finalFilePath);
        console.log(`File ${finalFilename} assembled successfully at ${finalFilePath}`);

        // Cleanup: Remove temporary directory and its contents
        try {
          const files = fs.readdirSync(chunkDir);
          for (const file of files) {
            await unlink(path.join(chunkDir, file));
          }
          await rmdir(chunkDir);
          console.log(`Cleaned up temporary directory: ${chunkDir}`);
        } catch (cleanupError) {
          console.error(`Error during cleanup of ${chunkDir}: ${cleanupError}`);
        }

        return NextResponse.json({
          success: true,
          message: "File uploaded and assembled successfully",
          filename: finalFilename,
          path: `/uploads/${finalFilename}`,
          url: `/uploads/${finalFilename}`, // Ensure URL is relative to public
          serverData: { uploadedBy: "api-route" }, // Example server data
          customId: uploadId, // Or generate a new one if needed
          appUrl: request.nextUrl.origin,
          ufsUrl: `${request.nextUrl.origin}/uploads/${finalFilename}`,
          fileHash: "server-generated-hash-if-any", // Placeholder for potential full file hash
        });
      } else {
        return NextResponse.json({ success: true, message: `Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully` });
      }
    } catch (error) {
      console.error(`Error processing chunk ${chunkIndex} for ${originalFilename}: ${error}`);
      return NextResponse.json({ success: false, error: "Error processing chunk" }, { status: 500 });
    }
  } else {
    // Handle as a single, non-chunked file upload (legacy or simple upload)
    console.log("Handling as a single file upload.");
    const file = chunk; // Use the 'chunk' variable which is the file data

    const validationError = validateFileMeta(
      file.size,
      file.type,
      file.name,
      MAX_FILE_SIZE,
      ALLOWED_FILE_TYPES
    );

    if (validationError) {
      console.error(`File validation failed for ${file.name}: ${validationError.details}`);
      return NextResponse.json({ success: false, error: validationError.error, details: validationError.details, file: validationError.file }, { status: validationError.status });
    }
    console.log(`File validated: ${file.name}, Type: ${file.type}`);

    const uniqueFilename = sanitizeAndGenerateUniqueFilename(file.name);
    const filePath = path.join(process.cwd(), "public", "uploads", uniqueFilename);
    const fileUrl = `/uploads/${uniqueFilename}`; // URL relative to public folder

    try {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);
      console.log(`File ${uniqueFilename} saved to ${filePath}`);

      return NextResponse.json({
        success: true,
        message: "File uploaded successfully",
        filename: uniqueFilename,
        path: filePath, // Server path
        url: fileUrl, // Client-accessible URL
        serverData: { uploadedBy: "api-route" }, // Example server data
        customId: "single-file-" + Date.now(), // Example custom ID
        appUrl: request.nextUrl.origin,
        ufsUrl: `${request.nextUrl.origin}${fileUrl}`,
        fileHash: "server-generated-hash-if-any", // Placeholder
      });
    } catch (e) {
      console.error(`Error saving file ${uniqueFilename}: ${e}`);
      return NextResponse.json({ success: false, error: "Error saving file" }, { status: 500 });
    }
  }
}
