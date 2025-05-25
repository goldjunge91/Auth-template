import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/upload/route';
import * as helpers from '@/lib/upload/file-upload-server-helpers';
import fsPromises from 'fs/promises';
import { NextResponse } from 'next/server';
import { 
  chunkUploadResponseSchema, 
  fileUploadResponseSchema,
  errorResponseSchema, // Import errorResponseSchema
} from '@/lib/upload/schemas/file-upload-schemas';
import { TMP_UPLOAD_DIR, FINAL_UPLOAD_DIR, MAX_FILE_SIZE, MAX_FILE_SIZE_MB, ALLOWED_FILE_TYPES, ERROR_MESSAGES } from '@/config/file-upload-config'; // Import MAX_FILE_SIZE
import path from 'path';

// Mock helper functions
vi.mock('@/lib/upload/file-upload-server-helpers');

// Mock fs/promises
// Define mocks directly in the factory to avoid hoisting issues with external consts
vi.mock('fs/promises', () => {
  const actualMockFsPromises = {
    writeFile: vi.fn(),
    access: vi.fn(),
    mkdir: vi.fn(),
    stat: vi.fn(),
    unlink: vi.fn(),
    rmdir: vi.fn(),
    // constants: { F_OK: 0 } // Example if needed
  };
  return {
    ...actualMockFsPromises, // Spread named exports
    default: actualMockFsPromises, // Provide default export
  };
});

// Mock NextResponse.json
vi.mock('next/server', async () => {
  const actual = await vi.importActual('next/server');
  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      json: vi.fn((body, init) => {
        return {
          json: async () => body, 
          status: init?.status || 200, 
          headers: new Headers(init?.headers), 
        } as any; 
      }),
    },
  };
});

// Helper to create Mock NextRequest
function createMockRequest(formDataEntries: Record<string, string | Blob>, headers: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(formDataEntries)) {
    formData.append(key, value as any); 
  }
  return {
    formData: vi.fn().mockResolvedValue(formData),
    headers: new Headers(headers),
    nextUrl: { 
      origin: 'http://localhost:3000'
    }
  } as any; 
}

describe('POST /api/upload', () => { 
  const ABS_TMP_UPLOAD_DIR = path.join('/app', TMP_UPLOAD_DIR);
  const ABS_FINAL_UPLOAD_DIR = path.join('/app', FINAL_UPLOAD_DIR);
  const UPLOAD_ID_DEFAULT = 'test-upload-id-123';
  const ORIGINAL_FILENAME_DEFAULT = 'test-original.png';
  const FILE_TYPE_DEFAULT = 'image/png';
  const FILE_SIZE_DEFAULT_STR = '10240'; // 10KB
  const PARSED_FILE_SIZE_DEFAULT = parseInt(FILE_SIZE_DEFAULT_STR, 10);
  const TOTAL_CHUNKS_DEFAULT = 3;
  const SANITIZED_UNIQUE_FILENAME_DEFAULT = 'unique-filename.png';
  const CHUNK_DIR_PATH_DEFAULT = path.join(ABS_TMP_UPLOAD_DIR, UPLOAD_ID_DEFAULT);

  beforeEach(() => {
    vi.mocked(helpers.ensureUploadDirsExist).mockResolvedValue(undefined);
    vi.mocked(helpers.validateFileMeta).mockReturnValue(null);
    vi.mocked(helpers.validateChunkHash).mockResolvedValue(true); 
    vi.mocked(helpers.sanitizeAndGenerateUniqueFilename).mockReturnValue(SANITIZED_UNIQUE_FILENAME_DEFAULT);
    vi.mocked(helpers.assembleChunks).mockResolvedValue(true); // Default success for assembly
    vi.mocked(fsPromises.writeFile).mockResolvedValue(undefined);
    vi.mocked(fsPromises.access).mockResolvedValue(undefined); 
    vi.mocked(fsPromises.mkdir).mockResolvedValue(undefined); 
    vi.mocked(fsPromises.unlink).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Successful Chunked Upload', () => {
    it('should handle the first chunk successfully', async () => {
      const chunkIndex = 0;
      const chunkBlob = new Blob(['part1']);
      const mockRequest = createMockRequest(
        { chunk: chunkBlob },
        {
          'X-Upload-ID': UPLOAD_ID_DEFAULT,
          'X-Chunk-Index': String(chunkIndex),
          'X-Total-Chunks': String(TOTAL_CHUNKS_DEFAULT),
          'X-Original-Filename': ORIGINAL_FILENAME_DEFAULT,
          'X-File-Type': FILE_TYPE_DEFAULT,
          'X-File-Size': FILE_SIZE_DEFAULT_STR,
        }
      );

      vi.mocked(fsPromises.access).mockImplementation(async (p) => {
        if (p === CHUNK_DIR_PATH_DEFAULT) {
          const error = new Error('ENOENT: no such file or directory') as any;
          error.code = 'ENOENT';
          throw error;
        }
        return undefined;
      });
      
      const response = await POST(mockRequest);
      const responseBody = await response.json();

      expect(helpers.ensureUploadDirsExist).toHaveBeenCalledTimes(1);
      expect(helpers.validateFileMeta).toHaveBeenCalledWith(
        PARSED_FILE_SIZE_DEFAULT,
        FILE_TYPE_DEFAULT,
        ORIGINAL_FILENAME_DEFAULT,
        MAX_FILE_SIZE, // Use the direct byte value from config
        ALLOWED_FILE_TYPES
      );
      expect(fsPromises.access).toHaveBeenCalledWith(CHUNK_DIR_PATH_DEFAULT); 
      expect(fsPromises.mkdir).toHaveBeenCalledWith(CHUNK_DIR_PATH_DEFAULT, { recursive: true }); // CHUNK_DIR_PATH_DEFAULT is now absolute
      
      const expectedChunkPath = path.join(CHUNK_DIR_PATH_DEFAULT, `chunk-${chunkIndex}.tmp`); // CHUNK_DIR_PATH_DEFAULT is now absolute
      const fileBuffer = await chunkBlob.arrayBuffer();
      expect(fsPromises.writeFile).toHaveBeenCalledWith(expectedChunkPath, Buffer.from(fileBuffer));
      
      expect(response.status).toBe(200);
      // As per logs: {"success":true,"message":"Chunk 1/3 uploaded successfully","chunkIndex":0,"totalChunks":3}
      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: true, message: `Chunk ${chunkIndex + 1}/${TOTAL_CHUNKS_DEFAULT} uploaded successfully`, chunkIndex: chunkIndex, totalChunks: TOTAL_CHUNKS_DEFAULT }, 
        { status: 200 }
      );
      
      const validationResult = chunkUploadResponseSchema.safeParse(responseBody);
      expect(validationResult.success).toBe(true);
    });

    it('should handle a middle chunk successfully', async () => {
      const chunkIndex = 1;
      const chunkBlob = new Blob(['part2']);
      const mockRequest = createMockRequest(
        { chunk: chunkBlob },
        {
          'X-Upload-ID': UPLOAD_ID_DEFAULT,
          'X-Chunk-Index': String(chunkIndex),
          'X-Total-Chunks': String(TOTAL_CHUNKS_DEFAULT),
          'X-Original-Filename': ORIGINAL_FILENAME_DEFAULT, 
          'X-File-Type': FILE_TYPE_DEFAULT,
          'X-File-Size': FILE_SIZE_DEFAULT_STR,
        }
      );

      vi.mocked(fsPromises.access).mockResolvedValue(undefined); 

      const response = await POST(mockRequest);
      await response.json();

      expect(helpers.validateFileMeta).not.toHaveBeenCalled(); 
      const expectedChunkPath = path.join(CHUNK_DIR_PATH_DEFAULT, `chunk-${chunkIndex}.tmp`); // CHUNK_DIR_PATH_DEFAULT is now absolute
      const fileBuffer = await chunkBlob.arrayBuffer();
      expect(fsPromises.writeFile).toHaveBeenCalledWith(expectedChunkPath, Buffer.from(fileBuffer));
      expect(response.status).toBe(200);
      // As per logs: {"success":true,"message":"Chunk 2/3 uploaded successfully","chunkIndex":1,"totalChunks":3}
      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: true, message: `Chunk ${chunkIndex + 1}/${TOTAL_CHUNKS_DEFAULT} uploaded successfully`, chunkIndex: chunkIndex, totalChunks: TOTAL_CHUNKS_DEFAULT },
        { status: 200 }
      );
    });

    it('should handle the last chunk successfully, assemble, and return file info', async () => {
      const chunkIndex = TOTAL_CHUNKS_DEFAULT - 1; 
      const chunkBlob = new Blob(['part3']);
      const mockRequest = createMockRequest(
        { chunk: chunkBlob },
        {
          'X-Upload-ID': UPLOAD_ID_DEFAULT,
          'X-Chunk-Index': String(chunkIndex),
          'X-Total-Chunks': String(TOTAL_CHUNKS_DEFAULT),
          'X-Original-Filename': ORIGINAL_FILENAME_DEFAULT,
          'X-File-Type': FILE_TYPE_DEFAULT,
          'X-File-Size': FILE_SIZE_DEFAULT_STR,
        }
      );
      
      const response = await POST(mockRequest);
      const responseBody = await response.json();
      
      const expectedFinalPath = path.join(ABS_FINAL_UPLOAD_DIR, SANITIZED_UNIQUE_FILENAME_DEFAULT);
      expect(helpers.assembleChunks).toHaveBeenCalledWith(
        ABS_TMP_UPLOAD_DIR, 
        UPLOAD_ID_DEFAULT,
        TOTAL_CHUNKS_DEFAULT,
        expectedFinalPath
      );
      expect(response.status).toBe(200);
      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          success: true,
          message: "File uploaded and assembled successfully", // Exact string from log
          filename: SANITIZED_UNIQUE_FILENAME_DEFAULT,
          fileUrl: `/uploads/${SANITIZED_UNIQUE_FILENAME_DEFAULT}`,
          fileName: SANITIZED_UNIQUE_FILENAME_DEFAULT, 
          path: `/uploads/${SANITIZED_UNIQUE_FILENAME_DEFAULT}`, 
          url: `/uploads/${SANITIZED_UNIQUE_FILENAME_DEFAULT}`,
          serverData: { uploadedBy: "api-route" }, 
          customId: UPLOAD_ID_DEFAULT,
          appUrl: "http://localhost:3000",
          ufsUrl: `http://localhost:3000/uploads/${SANITIZED_UNIQUE_FILENAME_DEFAULT}`,
          fileHash: "server-generated-hash-if-any" // Exact string from log, or expect.any(String) if truly dynamic
        },
        { status: 200 }
      );
      const validationResult = fileUploadResponseSchema.safeParse(responseBody);
      expect(validationResult.success).toBe(true);
    });
  });

  describe('Chunked Upload with Hash Error', () => {
    it('should return 400 if validateChunkHash returns false and cleanup failed chunk', async () => {
      const UPLOAD_ID_HASH_FAIL = 'test-hash-fail-id';
      const CHUNK_INDEX_HASH_FAIL = 0;
      const CHUNK_DATA_STR = 'chunkdata';
      const CLIENT_HASH = 'client-provided-hash';
      const chunkBlob = new Blob([CHUNK_DATA_STR]);
      const chunkBuffer = Buffer.from(await chunkBlob.arrayBuffer());
      const ABS_CHUNK_DIR_PATH_HASH_FAIL = path.join(ABS_TMP_UPLOAD_DIR, UPLOAD_ID_HASH_FAIL);
      const FAILED_CHUNK_PATH = path.join(ABS_CHUNK_DIR_PATH_HASH_FAIL, `chunk-${CHUNK_INDEX_HASH_FAIL}.tmp`);

      vi.mocked(helpers.validateChunkHash).mockResolvedValue(false);
      vi.mocked(fsPromises.access).mockImplementation(async (p) => {
        if (p === ABS_CHUNK_DIR_PATH_HASH_FAIL) { throw { code: 'ENOENT' } as Error; }
      });

      const mockRequest = createMockRequest(
        { chunk: chunkBlob },
        {
          'X-Upload-ID': UPLOAD_ID_HASH_FAIL,
          'X-Chunk-Index': String(CHUNK_INDEX_HASH_FAIL),
          'X-Total-Chunks': '1',
          'X-Original-Filename': 'test.png', 'X-File-Type': 'image/png', 'X-File-Size': '100',
          'X-Chunk-Hash': CLIENT_HASH,
        }
      );

      const response = await POST(mockRequest);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: "Chunk integrity check failed" }, { status: 400 } // Exact string from log
      );
      const validationResult = errorResponseSchema.safeParse(body);
      expect(validationResult.success).toBe(true);
      if(validationResult.success) expect(validationResult.data.error).toBe("Chunk integrity check failed"); 
      
      expect(fsPromises.writeFile).toHaveBeenCalledWith(FAILED_CHUNK_PATH, chunkBuffer);
      expect(helpers.validateChunkHash).toHaveBeenCalledWith(chunkBuffer, CLIENT_HASH);
      expect(fsPromises.unlink).toHaveBeenCalledWith(FAILED_CHUNK_PATH);
      expect(helpers.assembleChunks).not.toHaveBeenCalled();
    });
  });

  describe('Chunked Upload with File Metadata Errors', () => {
    const UPLOAD_ID_META_FAIL = 'test-meta-fail-id';
    const CHUNK_INDEX_FIRST = 0;
    const TOTAL_CHUNKS_SINGLE = 1;

    it('should return 413 if validateFileMeta reports file too large', async () => {
      const largeFileSize = String((MAX_FILE_SIZE_MB + 5) * 1024 * 1024); 
      const originalFilename = 'largefile.png';
      const fileType = 'image/png';
      const actualSizeForMessage = MAX_FILE_SIZE_MB + 5; 
      const expectedErrorMessage = ERROR_MESSAGES.FILE_TOO_LARGE(originalFilename, actualSizeForMessage);
      
      vi.mocked(helpers.validateFileMeta).mockReturnValue({ 
        status: 413, 
        error: expectedErrorMessage
      });

      const mockRequest = createMockRequest(
        { chunk: new Blob(['chunkdata']) },
        {
          'X-Upload-ID': UPLOAD_ID_META_FAIL,
          'X-Chunk-Index': String(CHUNK_INDEX_FIRST),
          'X-Total-Chunks': String(TOTAL_CHUNKS_SINGLE),
          'X-Original-Filename': originalFilename,
          'X-File-Type': fileType,
          'X-File-Size': largeFileSize,
        }
      );

      const response = await POST(mockRequest);
      const body = await response.json();

      expect(response.status).toBe(413);
      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: expectedErrorMessage }, { status: 413 }
      );
      const validationResult = errorResponseSchema.safeParse(body);
      expect(validationResult.success).toBe(true); 
      if(validationResult.success) expect(validationResult.data.error).toBe(expectedErrorMessage);

      expect(helpers.validateFileMeta).toHaveBeenCalledWith(
        Number(largeFileSize), fileType, originalFilename, MAX_FILE_SIZE, ALLOWED_FILE_TYPES
      );
      expect(fsPromises.writeFile).not.toHaveBeenCalled();
      expect(helpers.assembleChunks).not.toHaveBeenCalled();
    });

    it('should return 415 if validateFileMeta reports invalid file type', async () => {
      const originalFilename = 'invalidtype.exe';
      const invalidFileType = 'application/octet-stream';
      const fileSize = '1024'; 
      const expectedErrorMessage = ERROR_MESSAGES.UNSUPPORTED_FILE_TYPE(originalFilename, ALLOWED_FILE_TYPES);

      vi.mocked(helpers.validateFileMeta).mockReturnValue({
        status: 415, error: expectedErrorMessage,
      });

      const mockRequest = createMockRequest(
        { chunk: new Blob(['chunkdata']) },
        {
          'X-Upload-ID': UPLOAD_ID_META_FAIL,
          'X-Chunk-Index': String(CHUNK_INDEX_FIRST),
          'X-Total-Chunks': String(TOTAL_CHUNKS_SINGLE),
          'X-Original-Filename': originalFilename, 'X-File-Type': invalidFileType, 'X-File-Size': fileSize,
        }
      );

      const response = await POST(mockRequest);
      const body = await response.json();

      expect(response.status).toBe(415);
      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: expectedErrorMessage }, { status: 415 }
      );
      const validationResult = errorResponseSchema.safeParse(body);
      expect(validationResult.success).toBe(true);
      if(validationResult.success) expect(validationResult.data.error).toBe(expectedErrorMessage);
      
      expect(helpers.validateFileMeta).toHaveBeenCalledWith(
        Number(fileSize), invalidFileType, originalFilename, MAX_FILE_SIZE, ALLOWED_FILE_TYPES
      );
      expect(fsPromises.writeFile).not.toHaveBeenCalled();
      expect(helpers.assembleChunks).not.toHaveBeenCalled();
    });
  });

  describe('Chunked Upload with Server-Side Errors', () => {
    const UPLOAD_ID_SERVER_FAIL = 'test-server-fail-id';
    const CHUNK_INDEX_FIRST = 0;
    const TOTAL_CHUNKS_SINGLE = 1;
    const ORIGINAL_FILENAME_SERVER_FAIL = 'test-server.png';
    const FILE_TYPE_SERVER_FAIL = 'image/png';
    const FILE_SIZE_SERVER_FAIL_STR = '100'; 

    it('should return 500 if fsPromises.writeFile throws an error', async () => {
      const writeError = new Error('Disk full');
      vi.mocked(fsPromises.writeFile).mockRejectedValue(writeError);
      
      const ABS_CHUNK_DIR_PATH_SERVER_FAIL = path.join(ABS_TMP_UPLOAD_DIR, UPLOAD_ID_SERVER_FAIL);
      const chunkBlob = new Blob(['chunkdata']);
      
      vi.mocked(fsPromises.access).mockImplementation(async (p) => {
        if (p === ABS_CHUNK_DIR_PATH_SERVER_FAIL) { throw { code: 'ENOENT' } as Error; }
      });

      const mockRequest = createMockRequest(
        { chunk: chunkBlob },
        {
          'X-Upload-ID': UPLOAD_ID_SERVER_FAIL,
          'X-Chunk-Index': String(CHUNK_INDEX_FIRST),
          'X-Total-Chunks': String(TOTAL_CHUNKS_SINGLE),
          'X-Original-Filename': ORIGINAL_FILENAME_SERVER_FAIL,
          'X-File-Type': FILE_TYPE_SERVER_FAIL,
          'X-File-Size': FILE_SIZE_SERVER_FAIL_STR,
        }
      );

      const response = await POST(mockRequest);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: "Error processing chunk", details: writeError.message }, { status: 500 } // Exact strings from log
      );
      const validationResult = errorResponseSchema.safeParse(body);
      expect(validationResult.success).toBe(true);
      if(validationResult.success) expect(validationResult.data.error).toBe("Error processing chunk");

      expect(helpers.ensureUploadDirsExist).toHaveBeenCalled();
      expect(helpers.validateFileMeta).toHaveBeenCalled();
      expect(fsPromises.mkdir).toHaveBeenCalledWith(ABS_CHUNK_DIR_PATH_SERVER_FAIL, { recursive: true });

      const expectedChunkPath = path.join(ABS_CHUNK_DIR_PATH_SERVER_FAIL, `chunk-${CHUNK_INDEX_FIRST}.tmp`);
      const fileBuffer = await chunkBlob.arrayBuffer();
      expect(fsPromises.writeFile).toHaveBeenCalledWith(expectedChunkPath, Buffer.from(fileBuffer));
      
      expect(helpers.assembleChunks).not.toHaveBeenCalled();
      expect(fsPromises.unlink).not.toHaveBeenCalledWith(expectedChunkPath);
    });

    it('should return 500 if assembleChunks returns false', async () => {
      const UPLOAD_ID_ASSEMBLE_FAIL = 'test-assemble-fail-id';
      const CHUNK_INDEX_LAST = 0; 
      const TOTAL_CHUNKS_FAIL_ASSEMBLY = 1;
      const ORIGINAL_FILENAME_ASSEMBLE_FAIL = 'test-assemble.mp4';
      const FILE_TYPE_ASSEMBLE_FAIL = 'video/mp4';
      const FILE_SIZE_ASSEMBLE_FAIL_STR = '200';
      const SANITIZED_FILENAME_FOR_ASSEMBLY_FAIL = 'unique-assemble-fail.mp4';

      vi.mocked(helpers.validateFileMeta).mockReturnValue(null); 
      vi.mocked(helpers.validateChunkHash).mockResolvedValue(true); 
      vi.mocked(fsPromises.writeFile).mockResolvedValue(undefined); 
      vi.mocked(helpers.sanitizeAndGenerateUniqueFilename).mockReturnValue(SANITIZED_FILENAME_FOR_ASSEMBLY_FAIL);
      vi.mocked(helpers.assembleChunks).mockResolvedValue(false); 

      const ABS_CHUNK_DIR_PATH_ASSEMBLE_FAIL = path.join(ABS_TMP_UPLOAD_DIR, UPLOAD_ID_ASSEMBLE_FAIL);
      const chunkBlob = new Blob(['lastchunkdata']);

      vi.mocked(fsPromises.access).mockImplementation(async (p) => {
        if (p === ABS_CHUNK_DIR_PATH_ASSEMBLE_FAIL) { throw { code: 'ENOENT' } as Error; }
      });
      
      const mockRequest = createMockRequest(
        { chunk: chunkBlob },
        {
          'X-Upload-ID': UPLOAD_ID_ASSEMBLE_FAIL,
          'X-Chunk-Index': String(CHUNK_INDEX_LAST),
          'X-Total-Chunks': String(TOTAL_CHUNKS_FAIL_ASSEMBLY),
          'X-Original-Filename': ORIGINAL_FILENAME_ASSEMBLE_FAIL,
          'X-File-Type': FILE_TYPE_ASSEMBLE_FAIL,
          'X-File-Size': FILE_SIZE_ASSEMBLE_FAIL_STR,
        }
      );

      const response = await POST(mockRequest);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(NextResponse.json).toHaveBeenCalledWith(
        { success: false, error: "Failed to assemble file chunks", details: "One or more chunks could not be processed" }, { status: 500 } // Exact strings from log
      );
      const validationResult = errorResponseSchema.safeParse(body);
      expect(validationResult.success).toBe(true);
      if(validationResult.success) expect(validationResult.data.error).toBe("Failed to assemble file chunks");
      
      expect(helpers.ensureUploadDirsExist).toHaveBeenCalled();
      expect(helpers.validateFileMeta).toHaveBeenCalled();
      expect(fsPromises.mkdir).toHaveBeenCalledWith(ABS_CHUNK_DIR_PATH_ASSEMBLE_FAIL, { recursive: true });
      
      const expectedChunkPath = path.join(ABS_CHUNK_DIR_PATH_ASSEMBLE_FAIL, `chunk-${CHUNK_INDEX_LAST}.tmp`);
      const fileBuffer = await chunkBlob.arrayBuffer();
      expect(fsPromises.writeFile).toHaveBeenCalledWith(expectedChunkPath, Buffer.from(fileBuffer));
      expect(helpers.sanitizeAndGenerateUniqueFilename).toHaveBeenCalledWith(ORIGINAL_FILENAME_ASSEMBLE_FAIL);

      const expectedFinalPath = path.join(ABS_FINAL_UPLOAD_DIR, SANITIZED_FILENAME_FOR_ASSEMBLY_FAIL);
      expect(helpers.assembleChunks).toHaveBeenCalledWith(
        ABS_TMP_UPLOAD_DIR, UPLOAD_ID_ASSEMBLE_FAIL, TOTAL_CHUNKS_FAIL_ASSEMBLY, expectedFinalPath
      );
      expect(fsPromises.unlink).not.toHaveBeenCalledWith(expectedFinalPath);
    });
  });

  describe('Chunked Upload with Header Errors', () => {
    const baselineHeaders: Record<string, string> = {
      'X-Upload-ID': 'test-header-id',
      'X-Chunk-Index': '0',
      'X-Total-Chunks': '1',
      'X-Original-Filename': 'test.png',
      'X-File-Type': 'image/png',
      'X-File-Size': '100',
    };
    const formDataEntries = { chunk: new Blob(['chunkdata']) };

    const requiredHeaders = [
      'X-Upload-ID', 'X-Chunk-Index', 'X-Total-Chunks', 
      'X-Original-Filename', 'X-File-Type', 'X-File-Size'
    ];

    requiredHeaders.forEach(headerToRemove => {
      it(`should return 501 if ${headerToRemove} header is missing`, async () => {
        const headers = { ...baselineHeaders };
        delete headers[headerToRemove];
        const mockRequest = createMockRequest(formDataEntries, headers);
        const response = await POST(mockRequest);
        const body = await response.json();

        expect(response.status).toBe(501); // Falls through to single file upload path
        expect(NextResponse.json).toHaveBeenCalledWith(
          { success: false, error: "Single file upload not implemented in this version" }, { status: 501 } // Removed status from body
        );
        const validationResult = errorResponseSchema.safeParse(body);
        expect(validationResult.success).toBe(true); 
        if(validationResult.success) expect(validationResult.data.error).toBe("Single file upload not implemented in this version");

        expect(helpers.validateFileMeta).not.toHaveBeenCalled();
        expect(fsPromises.writeFile).not.toHaveBeenCalled();
        expect(helpers.assembleChunks).not.toHaveBeenCalled();
      });
    });
    
    // Test cases for invalid (but present) header values
    const invalidHeaderTestCases = [
      { name: 'X-Chunk-Index is not a number', header: 'X-Chunk-Index', value: 'not-a-number', expectedStatus: 400, expectedMessage: ERROR_MESSAGES.INVALID_CHUNK_INDEX_HEADER },
      { name: 'X-Total-Chunks is not a number', header: 'X-Total-Chunks', value: 'not-a-number', expectedStatus: 400, expectedMessage: ERROR_MESSAGES.INVALID_TOTAL_CHUNKS_HEADER },
      { name: 'X-File-Size is not a number', header: 'X-File-Size', value: 'not-a-number', expectedStatus: 400, expectedMessage: ERROR_MESSAGES.INVALID_FILE_SIZE_HEADER },
      { name: 'X-Chunk-Index is negative', header: 'X-Chunk-Index', value: '-1', expectedStatus: 400, expectedMessage: ERROR_MESSAGES.INVALID_CHUNK_INDEX_HEADER },
      { name: 'X-Total-Chunks is zero', header: 'X-Total-Chunks', value: '0', expectedStatus: 400, expectedMessage: ERROR_MESSAGES.INVALID_TOTAL_CHUNKS_HEADER },
      { name: 'X-Total-Chunks is negative', header: 'X-Total-Chunks', value: '-1', expectedStatus: 400, expectedMessage: ERROR_MESSAGES.INVALID_TOTAL_CHUNKS_HEADER },
      { name: 'X-File-Size is negative', header: 'X-File-Size', value: '-100', expectedStatus: 400, expectedMessage: ERROR_MESSAGES.INVALID_FILE_SIZE_HEADER },
      { name: 'X-Chunk-Index is equal to X-Total-Chunks', header: 'X-Chunk-Index', value: '1', totalChunks: '1', expectedStatus: 400, expectedMessage: ERROR_MESSAGES.INVALID_CHUNK_INDEX_HEADER },
      { name: 'X-Chunk-Index is greater than X-Total-Chunks', header: 'X-Chunk-Index', value: '2', totalChunks: '1', expectedStatus: 400, expectedMessage: ERROR_MESSAGES.INVALID_CHUNK_INDEX_HEADER },
    ];

    invalidHeaderTestCases.forEach(tc => {
      it(`should return ${tc.expectedStatus} if ${tc.name}`, async () => {
        const headers = { ...baselineHeaders, [tc.header]: tc.value };
        if (tc.totalChunks) headers['X-Total-Chunks'] = tc.totalChunks; 

        const mockRequest = createMockRequest(formDataEntries, headers);
        const response = await POST(mockRequest);
        const body = await response.json();

        expect(response.status).toBe(tc.expectedStatus);
        expect(NextResponse.json).toHaveBeenCalledWith(
          { success: false, error: tc.expectedMessage }, { status: tc.expectedStatus }
        );
        const validationResult = errorResponseSchema.safeParse(body);
        expect(validationResult.success).toBe(true);
        if(validationResult.success) expect(validationResult.data.error).toBe(tc.expectedMessage);

        expect(helpers.validateFileMeta).not.toHaveBeenCalled();
        expect(fsPromises.writeFile).not.toHaveBeenCalled();
        expect(helpers.assembleChunks).not.toHaveBeenCalled();
      });
    });
  });
});
