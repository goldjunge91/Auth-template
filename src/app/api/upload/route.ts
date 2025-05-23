import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { writeFile, access, constants, unlink, mkdir, rmdir } from "fs/promises";
import fs from "fs";
import {
  ensureUploadDirsExist,
  validateFileMeta,
  sanitizeAndGenerateUniqueFilename,
  assembleChunks,
  validateChunkHash,
} from "@/lib/upload/file-upload-server-helpers";
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from "@/config/file-upload-config";
import { 
  fileUploadResponseSchema, 
  chunkUploadResponseSchema, 
  errorResponseSchema 
} from "@/lib/upload/schemas/file-upload-schemas";

export async function POST(request: NextRequest) {
  console.log("POST /api/upload called");
  try {
    await ensureUploadDirsExist();
    console.log("Upload directories ensured.");

    const formData = await request.formData();
    console.log("[API Route] FormData retrieved.");
    const chunkData = formData.get("chunk") as Blob | null;

    if (!chunkData) {
      console.error("[API Route] No chunk data found in formData. Headers:", JSON.stringify(Object.fromEntries(request.headers.entries())));
      return NextResponse.json(
        {
          success: false,
          error: "No chunk data uploaded",
          status: 400
        },
        { status: 400 }
      );
    }
    console.log(`[API Route] Chunk data found, size: ${chunkData.size}`);

    const uploadId = request.headers.get("X-Upload-ID");
    const chunkIndexStr = request.headers.get("X-Chunk-Index");
    const totalChunksStr = request.headers.get("X-Total-Chunks");
    const originalFilename = request.headers.get("X-Original-Filename");
    const fileTypeFromHeader = request.headers.get("X-File-Type");
    const fileSizeStr = request.headers.get("X-File-Size");
    const clientChunkHash = request.headers.get("X-Chunk-Hash");

    console.log("Request Headers:", {
      uploadId,
      chunkIndexStr,
      totalChunksStr,
      originalFilename,
      fileTypeFromHeader,
      fileSizeStr,
      clientChunkHash
    });

    if (uploadId && chunkIndexStr && totalChunksStr && originalFilename && fileTypeFromHeader && fileSizeStr) {
      console.log(`Handling as chunked upload. Upload ID: ${uploadId}`);
      const chunkIndex = parseInt(chunkIndexStr, 10);
      const totalChunks = parseInt(totalChunksStr, 10);
      const fileSize = parseInt(fileSizeStr, 10);
      console.log(`Parsed chunk info: index=${chunkIndex}, total=${totalChunks}, fileSize=${fileSize}`);

      if (chunkIndex === 0) {
        console.log("First chunk, validating file metadata...");
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
      console.log(`[API Route] Chunk directory: ${chunkDir}`);
      try {
        await access(chunkDir);
        // console.log("[API Route] Chunk directory already exists."); // Weniger ausführliches Logging
      } catch (e) {
        // console.log("[API Route] Chunk directory does not exist, creating...");
        await mkdir(chunkDir, { recursive: true });
        console.log(`[API Route] Created temporary directory for uploadId ${uploadId}: ${chunkDir}`);
      }

      const chunkFilePath = path.join(chunkDir, `chunk-${chunkIndex}.tmp`);
      // console.log(`[API Route] Chunk file path: ${chunkFilePath}`);
      const chunkBuffer = await chunkData.arrayBuffer(); // chunkData verwenden
      console.log(`[API Route] Chunk buffer read for ${originalFilename}, chunk ${chunkIndex}, size: ${chunkBuffer.byteLength}`);

      if (clientChunkHash) {
        console.log(`Client chunk hash for chunk ${chunkIndex}: ${clientChunkHash}. Validating...`);
        const isHashValid = await validateChunkHash(chunkBuffer, clientChunkHash);
        if (!isHashValid) {
          console.error(`Chunk hash validation failed for ${originalFilename}, chunk ${chunkIndex}`);
          try {
            await unlink(chunkFilePath); // Attempt to delete invalid chunk if it was created
            console.log(`Attempted to delete invalid chunk: ${chunkFilePath}`);
          } catch (unlinkError: any) {
            // Log if the file didn't exist or couldn't be deleted, but don't fail the request for this
            console.warn(`Error deleting invalid chunk ${chunkFilePath} (might not exist yet): ${unlinkError.message}`);
          }
          return NextResponse.json({ success: false, error: "Chunk integrity check failed" }, { status: 400 });
        }
        console.log(`Chunk hash validated for ${originalFilename}, chunk ${chunkIndex}`);
      } else {
        console.log(`No X-Chunk-Hash header present for chunk ${chunkIndex}. Skipping hash validation.`);
      }

      try {
        console.log(`[API Route] Writing chunk ${chunkIndex} for ${originalFilename} to ${chunkFilePath}`);
        await writeFile(chunkFilePath, Buffer.from(chunkBuffer)); // chunkBuffer direkt verwenden
        console.log(`[API Route] Saved chunk ${chunkIndex} for ${originalFilename} to ${chunkFilePath}`);

        if (chunkIndex === totalChunks - 1) {
          console.log(`[API Route] Received last chunk for ${originalFilename}. Assembling file...`);
          const finalFilename = sanitizeAndGenerateUniqueFilename(originalFilename);
          const finalFilePath = path.join(process.cwd(), "public", "uploads", finalFilename);
          const baseTmpDir = path.join(process.cwd(), "public", "uploads", "tmp");
          console.log(`Final filename: ${finalFilename}, Final path: ${finalFilePath}`);

          const success = await assembleChunks(baseTmpDir, uploadId, totalChunks, finalFilePath);
          
          if (!success) {
            return NextResponse.json({ 
              success: false, 
              error: "Failed to assemble file chunks", 
              details: "One or more chunks could not be processed" 
            }, { status: 500 });
          }
          
          console.log(`File ${finalFilename} assembled successfully at ${finalFilePath}`);

          const responsePayload = {
            success: true,
            message: "File uploaded and assembled successfully",
            filename: finalFilename,
            fileUrl: `/uploads/${finalFilename}`,
            fileName: finalFilename,
            path: `/uploads/${finalFilename}`,
            url: `/uploads/${finalFilename}`, // Für Abwärtskompatibilität
            serverData: { uploadedBy: "api-route" },
            customId: uploadId,
            appUrl: request.nextUrl.origin,
            ufsUrl: `${request.nextUrl.origin}/uploads/${finalFilename}`,
            fileHash: "server-generated-hash-if-any",
          };
          console.log("Sending chunk assembly success response:", JSON.stringify(responsePayload));
          return NextResponse.json(responsePayload);
        } else {
          const chunkResponse = {
            success: true,
            message: `Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`,
            chunkIndex: chunkIndex,
            totalChunks: totalChunks
          };
          console.log(`Sending chunk ${chunkIndex + 1} success response:`, JSON.stringify(chunkResponse));
          return NextResponse.json(chunkResponse);
        }
      } catch (error: any) {
        console.error(`Error processing chunk ${chunkIndex} for ${originalFilename}: ${error.message}`, error);
        const errorPayload = {
          success: false,
          error: "Error processing chunk",
          details: error.message,
          status: 500
        };
        return NextResponse.json(errorPayload, { status: 500 });
      }
    } else {
      // Hier ist der Code für den Single-File-Upload
      // ...
      // Vereinfachte Version für jetzt:
      return NextResponse.json({
        success: false,
        error: "Single file upload not implemented in this version",
        status: 501
      }, { status: 501 });
    }
  } catch (error: any) {
    console.error("Unhandled error in POST /api/upload:", error.message, error);
    return NextResponse.json({
      success: false,
      error: "Internal server error",
      details: error.message || "Unknown error",
      status: 500
    }, { status: 500 });
  }
}
