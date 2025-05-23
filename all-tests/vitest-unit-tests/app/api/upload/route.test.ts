import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { POST } from '@/app/api/upload/route';
import * as serverHelpers from '@/lib/upload/file-upload-server-helpers';
import * as config from '@/config/file-upload-config';
import * as fsPromises from 'fs/promises';
import path from 'path';
import { Buffer } from 'buffer';

// Mock server helpers and config
vi.mock('@/lib/upload/file-upload-server-helpers', async () => ({
  ensureUploadDirsExist: vi.fn(),
  validateFileMeta: vi.fn(),
  sanitizeAndGenerateUniqueFilename: vi.fn(),
  assembleChunks: vi.fn(),
  validateChunkHash: vi.fn(),
}));

vi.mock('@/config/file-upload-config', async () => ({
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['image/png', 'application/pdf'],
  TMP_UPLOAD_DIR: 'public/uploads/tmp',
  FINAL_UPLOAD_DIR: 'public/uploads',
  ERROR_MESSAGES: {
    // Add any specific messages if needed for assertions, otherwise not strictly necessary to mock all
  },
}));

vi.mock('fs/promises', async () => ({
  ...await vi.importActual<typeof fsPromises>('fs/promises'),
  writeFile: vi.fn(),
  access: vi.fn(),
  mkdir: vi.fn(),
  unlink: vi.fn(), // Mock unlink for potential cleanup in error paths
}));


describe('POST /api/upload', () => {
  let mockRequest: NextRequest;
  const mockFormData = new FormData();
  const mockFileChunk = new Blob(['chunk data'], { type: 'application/octet-stream' });

  const mockConsole = () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  };

  beforeEach(() => {
    vi.resetAllMocks();
    mockConsole();

    // Reset FormData for each test
    for (const key of mockFormData.keys()) {
      mockFormData.delete(key);
    }
    mockFormData.append('chunk', mockFileChunk);

    mockRequest = {
      headers: new Headers({
        'X-Upload-ID': 'test-upload-id',
        'X-Chunk-Index': '0',
        'X-Total-Chunks': '1',
        'X-Original-Filename': 'test.png',
        'X-File-Type': 'image/png',
        'X-File-Size': String(mockFileChunk.size),
        'X-Chunk-Hash': 'test-hash',
      }),
      formData: vi.fn().mockResolvedValue(mockFormData),
      nextUrl: {
        origin: 'http://localhost:3000'
      }
    } as unknown as NextRequest;

    // Default successful mocks
    vi.mocked(serverHelpers.ensureUploadDirsExist).mockResolvedValue({ baseUploadDir: 'mock/base', tmpDir: 'mock/tmp' });
    vi.mocked(serverHelpers.validateFileMeta).mockReturnValue(null);
    vi.mocked(serverHelpers.validateChunkHash).mockResolvedValue(true);
    vi.mocked(serverHelpers.sanitizeAndGenerateUniqueFilename).mockReturnValue('unique-test.png');
    vi.mocked(serverHelpers.assembleChunks).mockResolvedValue(true);
    vi.mocked(fsPromises.writeFile).mockResolvedValue(undefined);
    vi.mocked(fsPromises.access).mockRejectedValue({ code: 'ENOENT' }); // Dir does not exist initially
    vi.mocked(fsPromises.mkdir).mockResolvedValue(undefined);
  });

  it('should successfully process the first and only chunk (full upload)', async () => {
    const response = await POST(mockRequest);
    const jsonResponse = await response.json();

    expect(serverHelpers.ensureUploadDirsExist).toHaveBeenCalled();
    expect(serverHelpers.validateFileMeta).toHaveBeenCalledWith(
      mockFileChunk.size,
      'image/png',
      'test.png',
      config.MAX_FILE_SIZE,
      config.ALLOWED_FILE_TYPES
    );
    expect(serverHelpers.validateChunkHash).toHaveBeenCalled();
    expect(fsPromises.writeFile).toHaveBeenCalled();
    expect(serverHelpers.assembleChunks).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(jsonResponse.success).toBe(true);
    expect(jsonResponse.filename).toBe('unique-test.png');
    expect(jsonResponse.fileUrl).toBe('/uploads/unique-test.png');
  });

  it('should successfully process an intermediate chunk', async () => {
    mockRequest.headers.set('X-Chunk-Index', '0');
    mockRequest.headers.set('X-Total-Chunks', '2');

    const response = await POST(mockRequest);
    const jsonResponse = await response.json();

    expect(serverHelpers.validateFileMeta).toHaveBeenCalled(); // Called for first chunk
    expect(serverHelpers.validateChunkHash).toHaveBeenCalled();
    expect(fsPromises.writeFile).toHaveBeenCalled();
    expect(serverHelpers.assembleChunks).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(jsonResponse.success).toBe(true);
    expect(jsonResponse.message).toContain('Chunk 1/2 uploaded successfully');
  });

  it('should successfully process the last chunk of multiple chunks', async () => {
    mockRequest.headers.set('X-Chunk-Index', '1');
    mockRequest.headers.set('X-Total-Chunks', '2');
    // validateFileMeta should not be called for non-first chunks by route logic
    // (it's called inside the if (chunkIndex === 0) block)

    const response = await POST(mockRequest);
    const jsonResponse = await response.json();

    expect(serverHelpers.validateFileMeta).not.toHaveBeenCalled();
    expect(serverHelpers.validateChunkHash).toHaveBeenCalled();
    expect(fsPromises.writeFile).toHaveBeenCalled();
    expect(serverHelpers.assembleChunks).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(jsonResponse.success).toBe(true);
    expect(jsonResponse.filename).toBe('unique-test.png');
  });

  it('should return 400 if no chunk data is uploaded', async () => {
    const emptyFormData = new FormData(); // No 'chunk'
    vi.mocked(mockRequest.formData).mockResolvedValue(emptyFormData);

    const response = await POST(mockRequest);
    const jsonResponse = await response.json();

    expect(response.status).toBe(400);
    expect(jsonResponse.success).toBe(false);
    expect(jsonResponse.error).toBe('No chunk data uploaded');
  });

  it('should return 501 if headers for chunked upload are missing (triggering single file path)', async () => {
    mockRequest.headers.delete('X-Upload-ID'); // Remove one of the required headers

    const response = await POST(mockRequest);
    const jsonResponse = await response.json();

    expect(response.status).toBe(501);
    expect(jsonResponse.success).toBe(false);
    expect(jsonResponse.error).toBe('Single file upload not implemented in this version');
  });

  it('should return error if validateFileMeta fails for the first chunk', async () => {
    const validationError = { error: 'File too large', details: 'details', file: 'test.png', status: 413 };
    vi.mocked(serverHelpers.validateFileMeta).mockReturnValue(validationError);
    // Ensure it's the first chunk
    mockRequest.headers.set('X-Chunk-Index', '0');


    const response = await POST(mockRequest);
    const jsonResponse = await response.json();

    expect(response.status).toBe(413);
    expect(jsonResponse.success).toBe(false);
    expect(jsonResponse.error).toBe(validationError.error);
  });

  it('should return 400 if chunk hash validation fails', async () => {
    vi.mocked(serverHelpers.validateChunkHash).mockResolvedValue(false);

    const response = await POST(mockRequest);
    const jsonResponse = await response.json();

    expect(response.status).toBe(400);
    expect(jsonResponse.success).toBe(false);
    expect(jsonResponse.error).toBe('Chunk integrity check failed');
    expect(fsPromises.unlink).toHaveBeenCalled(); // Check if attempt to delete invalid chunk
  });
  
  it('should skip hash validation if X-Chunk-Hash header is not present', async () => {
    mockRequest.headers.delete('X-Chunk-Hash');
    // This is a last chunk scenario to complete the flow
    mockRequest.headers.set('X-Chunk-Index', '0');
    mockRequest.headers.set('X-Total-Chunks', '1');

    const response = await POST(mockRequest);
    const jsonResponse = await response.json();

    expect(serverHelpers.validateChunkHash).not.toHaveBeenCalled();
    expect(response.status).toBe(200); // Should proceed successfully without hash
    expect(jsonResponse.success).toBe(true);
  });

  it('should return 500 if writeFile fails', async () => {
    vi.mocked(fsPromises.writeFile).mockRejectedValue(new Error('Disk full'));

    const response = await POST(mockRequest);
    const jsonResponse = await response.json();

    expect(response.status).toBe(500);
    expect(jsonResponse.success).toBe(false);
    expect(jsonResponse.error).toBe('Error processing chunk');
    expect(jsonResponse.details).toBe('Disk full');
  });

  it('should return 500 if assembleChunks fails', async () => {
    vi.mocked(serverHelpers.assembleChunks).mockResolvedValue(false);
    // Ensure it's the last chunk
    mockRequest.headers.set('X-Chunk-Index', '0');
    mockRequest.headers.set('X-Total-Chunks', '1');

    const response = await POST(mockRequest);
    const jsonResponse = await response.json();

    expect(response.status).toBe(500);
    expect(jsonResponse.success).toBe(false);
    expect(jsonResponse.error).toBe('Failed to assemble file chunks');
  });
  
  it('should correctly create chunk directory if it does not exist', async () => {
    vi.mocked(fsPromises.access).mockRejectedValue({ code: 'ENOENT' }); // Simulate dir does not exist
    
    await POST(mockRequest);
    
    const expectedChunkDir = path.join(process.cwd(), config.TMP_UPLOAD_DIR, 'test-upload-id');
    expect(fsPromises.mkdir).toHaveBeenCalledWith(expectedChunkDir, { recursive: true });
  });

  it('should not try to create chunk directory if it already exists', async () => {
    vi.mocked(fsPromises.access).mockResolvedValue(undefined); // Simulate dir exists
    
    await POST(mockRequest);
    
    expect(fsPromises.mkdir).not.toHaveBeenCalledWith(path.join(process.cwd(), config.TMP_UPLOAD_DIR, 'test-upload-id'), { recursive: true });
  });

   it('should handle unhandled errors gracefully', async () => {
    vi.mocked(serverHelpers.ensureUploadDirsExist).mockRejectedValue(new Error('Unexpected catastrophic failure'));
    
    const response = await POST(mockRequest);
    const jsonResponse = await response.json();

    expect(response.status).toBe(500);
    expect(jsonResponse.success).toBe(false);
    expect(jsonResponse.error).toBe('Internal server error');
    expect(jsonResponse.details).toBe('Unexpected catastrophic failure');
  });

});
