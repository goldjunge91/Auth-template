import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import crypto from 'crypto'; // Node.js crypto for webcrypto.subtle
import { Buffer } from 'buffer';

import {
  validateChunkHash,
  sanitizeAndGenerateUniqueFilename,
  validateFileMeta,
  ensureUploadDirsExist,
  assembleChunks,
} from '@/lib/upload/file-upload-server-helpers';
import { TMP_UPLOAD_DIR, FINAL_UPLOAD_DIR, ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '@/config/file-upload-config';

// Mock the specific named imports that the assembleChunks function uses
vi.mock('fs/promises', () => ({
  stat: vi.fn(),
  mkdir: vi.fn(),
  readFile: vi.fn(),
  unlink: vi.fn(),
  rmdir: vi.fn(),
  access: vi.fn(),
  constants: {
    F_OK: 0
  }
}));

// Mock fs default import and its createWriteStream
vi.mock('fs', () => ({
  default: {
    createWriteStream: vi.fn(),
  },
  createWriteStream: vi.fn(),
}));

// Helper to create ArrayBuffer from string
const stringToArrayBuffer = (str: string): ArrayBuffer => {
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer as ArrayBuffer;
};

// Helper to calculate SHA-256 hash
const calculateSha256 = async (data: ArrayBuffer): Promise<string> => {
  const hashBuffer = await crypto.webcrypto.subtle.digest('SHA-256', data);
  return Buffer.from(hashBuffer).toString('hex');
};

describe('file-upload-server-helpers', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Mock console methods to allow spying - remove implementation to see debug output
    vi.spyOn(console, 'log');
    vi.spyOn(console, 'info');
    vi.spyOn(console, 'warn');
    vi.spyOn(console, 'error');
  });

  describe('validateChunkHash', () => {
    it('should return true if hashes match', async () => {
      const chunkData = stringToArrayBuffer('test chunk');
      const clientHash = await calculateSha256(chunkData);
      expect(await validateChunkHash(chunkData, clientHash)).toBe(true);
    });

    it('should return false if hashes do not match', async () => {
      const chunkData = stringToArrayBuffer('test chunk');
      const clientHash = 'invalidhash';
      expect(await validateChunkHash(chunkData, clientHash)).toBe(false);
    });

    it('should return true if clientHash is empty (skip validation)', async () => {
      const chunkData = stringToArrayBuffer('test chunk');
      expect(await validateChunkHash(chunkData, '')).toBe(true);
    });

    it('should return false and log error if crypto.subtle.digest fails', async () => {
      const chunkData = stringToArrayBuffer('test chunk');
      const clientHash = 'somehash';
      const digestSpy = vi.spyOn(crypto.webcrypto.subtle, 'digest').mockRejectedValueOnce(new Error('Crypto error'));
      expect(await validateChunkHash(chunkData, clientHash)).toBe(false);
      expect(console.error).toHaveBeenCalledWith("Error validating chunk hash:", expect.any(Error));
      digestSpy.mockRestore();
    });
  });

  describe('sanitizeAndGenerateUniqueFilename', () => {
    it('should sanitize and make filename unique', () => {
      const originalName = 'My File (1).jpg';
      const uniqueName = sanitizeAndGenerateUniqueFilename(originalName);
      expect(uniqueName).toMatch(/^my_file_1-[0-9]+-[0-9]+\.jpg$/);
    });

    it('should handle filenames without extensions', () => {
      const originalName = 'MyFileNoExtension';
      const uniqueName = sanitizeAndGenerateUniqueFilename(originalName);
      expect(uniqueName).toMatch(/^myfilenoextension-[0-9]+-[0-9]+$/);
    });

    it('should handle filenames with multiple dots', () => {
      const originalName = 'archive.tar.gz';
      const uniqueName = sanitizeAndGenerateUniqueFilename(originalName);
      expect(uniqueName).toMatch(/^archive.tar-[0-9]+-[0-9]+\.gz$/);
    });

    it('should handle very long filenames by truncating base name', () => {
        const longBase = "a".repeat(100);
        const originalName = `${longBase}.txt`;
        const uniqueName = sanitizeAndGenerateUniqueFilename(originalName);
        expect(uniqueName.startsWith(longBase.substring(0,50))).toBe(true);
        expect(uniqueName).toMatch(/-[0-9]+-[0-9]+\.txt$/);
      });

    it('should handle filenames with only special characters', () => {
      const originalName = '!@#$%^&*.png';
      // based on current sanitize: [^a-z0-9_\-\.] -> only dot and hyphen would remain from special chars
      // if it starts with '.', it might be tricky. Let's assume it becomes something like "-[timestamp]-[random].png"
      const uniqueName = sanitizeAndGenerateUniqueFilename(originalName);
      expect(uniqueName).toMatch(/^-([0-9]+)-([0-9]+)\.png$/); // Or similar, depending on exact sanitization of '.....'
    });
  });

  describe('validateFileMeta', () => {
    const fileName = 'test.png';
    const allowedTypes = ['image/png', 'image/jpeg'];
    const maxSize = 1024 * 1024; // 1MB

    it('should return null for valid file', () => {
      expect(validateFileMeta(500 * 1024, 'image/png', fileName, maxSize, allowedTypes)).toBeNull();
    });

    it('should return error if file is too large', () => {
      const result = validateFileMeta(2 * maxSize, 'image/png', fileName, maxSize, allowedTypes);
      expect(result).toEqual({
        error: 'File too large',
        details: `File "${fileName}" (${2 * maxSize} bytes) is too large. Max size is ${maxSize / (1024 * 1024)}MB (${maxSize} bytes).`,
        file: fileName,
        status: 413,
      });
    });

    it('should return error if file type is not allowed', () => {
      const result = validateFileMeta(500 * 1024, 'image/gif', fileName, maxSize, allowedTypes);
      expect(result).toEqual({
        error: 'Unsupported file type',
        details: `File type "image/gif" for file "${fileName}" is not allowed. Allowed types: ${allowedTypes.join(", ")}`,
        file: fileName,
        status: 415,
      });
    });

    it('should return error if file type is null', () => {
      const result = validateFileMeta(500 * 1024, null, fileName, maxSize, allowedTypes);
      expect(result).toEqual({
        error: 'Unsupported file type',
        details: `File type "null" for file "${fileName}" is not allowed. Allowed types: ${allowedTypes.join(", ")}`,
        file: fileName,
        status: 415,
      });
    });
  });

  describe('ensureUploadDirsExist', () => {
    const expectedBaseDir = path.join(process.cwd(), FINAL_UPLOAD_DIR);
    const expectedTmpDir = path.join(process.cwd(), TMP_UPLOAD_DIR);

    beforeEach(async () => {
      // Import the mocked functions
      const { stat, mkdir } = await import('fs/promises');
      vi.mocked(stat).mockClear();
      vi.mocked(mkdir).mockClear();
    });

    it('should do nothing if directories exist', async () => {
      const { stat, mkdir } = await import('fs/promises');
      vi.mocked(stat).mockResolvedValue({ isDirectory: () => true } as any); // Simulate dir exists
      await ensureUploadDirsExist();
      expect(stat).toHaveBeenCalledWith(expectedBaseDir);
      expect(stat).toHaveBeenCalledWith(expectedTmpDir);
      expect(mkdir).not.toHaveBeenCalled();
    });

    it('should create directories if they do not exist', async () => {
      const { stat, mkdir } = await import('fs/promises');
      vi.mocked(stat).mockRejectedValue({ code: 'ENOENT' }); // Simulate dir does not exist
      vi.mocked(mkdir).mockResolvedValue(undefined);

      await ensureUploadDirsExist();

      expect(mkdir).toHaveBeenCalledWith(expectedBaseDir, { recursive: true });
      expect(mkdir).toHaveBeenCalledWith(expectedTmpDir, { recursive: true });
      expect(console.info).toHaveBeenCalledWith(`Created directory: ${expectedBaseDir}`);
      expect(console.info).toHaveBeenCalledWith(`Created directory: ${expectedTmpDir}`);
    });

    it('should throw error if mkdir fails with other code than ENOENT for stat', async () => {
      const { stat } = await import('fs/promises');
      const mockError = new Error('Permission denied');
      vi.mocked(stat).mockRejectedValue(mockError); // Simulate other error

      await expect(ensureUploadDirsExist()).rejects.toThrow('Permission denied');
      expect(console.error).toHaveBeenCalledWith(`Error ensuring directory ${expectedBaseDir} exists:`, mockError);
    });
  });

  describe('assembleChunks', () => {
    const baseTmpDir = path.join(process.cwd(), TMP_UPLOAD_DIR);
    const uploadId = 'test-upload-id';
    const totalChunks = 2;
    const finalFilePath = path.join(process.cwd(), FINAL_UPLOAD_DIR, 'final-file.txt');
    const chunkDir = path.join(baseTmpDir, uploadId);

    let mockWriteStream: any;

    beforeEach(async () => {
      // Reset and configure mockWriteStream for each test in this describe block
      mockWriteStream = {
        write: vi.fn(),
        end: vi.fn(function(this: any, data?: any, encoding?: any, callback?: any) {
          const finalCallback = typeof data === 'function' ? data : typeof encoding === 'function' ? encoding : callback;
          const self = this; // Capture 'this' (mockWriteStream instance)

          process.nextTick(() => {
            if (self._shouldError && self.listeners && self.listeners['error']) {
              self.listeners['error'](self._errorToEmit || new Error('Simulated stream error'));
            } else if (self.listeners && self.listeners['finish']) {
              self.listeners['finish']();
            }
            
            // Call the stream.end callback if provided
            if (typeof finalCallback === 'function') {
              if (self._shouldError && self._errorToEmit) {
                // Some streams might pass the error to the end callback.
                // finalCallback(self._errorToEmit); 
              } else if (!self._shouldError) {
                finalCallback();
              }
            }
          });
        }),
        on: vi.fn(function(this: any, event, cb) {
          if (!this.listeners) this.listeners = {};
          this.listeners[event] = cb;
          return this; // Return 'this' for chaining
        }),
        listeners: {}, // Reset listeners object for each test
        _shouldError: false, // Reset flag
        _errorToEmit: null as Error | null, // Reset error
      };
      
      // Mock fs module imports
      const fs = await import('fs');
      const { access, readFile, unlink, rmdir, mkdir } = await import('fs/promises');
      
      vi.mocked(fs.default.createWriteStream).mockReturnValue(mockWriteStream);
      vi.mocked(access).mockResolvedValue(undefined); // Assume chunks exist by default
      vi.mocked(readFile).mockResolvedValue(Buffer.from('chunk data'));
      vi.mocked(unlink).mockResolvedValue(undefined);
      vi.mocked(rmdir).mockResolvedValue(undefined);
      vi.mocked(mkdir).mockResolvedValue(undefined); // For finalDir creation
    });

    it('should assemble chunks successfully and cleanup', async () => {
      const fs = await import('fs');
      const { readFile, unlink, rmdir, mkdir } = await import('fs/promises');
      
      const result = await assembleChunks(baseTmpDir, uploadId, totalChunks, finalFilePath);
      
      expect(result).toBe(true);
      expect(fs.default.createWriteStream).toHaveBeenCalledWith(finalFilePath);
      expect(mkdir).toHaveBeenCalledWith(path.dirname(finalFilePath), { recursive: true });
      expect(readFile).toHaveBeenCalledTimes(totalChunks);
      expect(mockWriteStream.write).toHaveBeenCalledTimes(totalChunks);
      expect(mockWriteStream.end).toHaveBeenCalled();
      expect(unlink).toHaveBeenCalledTimes(totalChunks);
      expect(rmdir).toHaveBeenCalledWith(chunkDir);
      expect(console.log).toHaveBeenCalledWith(`File assembled successfully at ${finalFilePath}`);
      expect(console.log).toHaveBeenCalledWith(`Temporary directory ${chunkDir} deleted successfully.`);
    });

    it('should return false if a chunk is not found', async () => {
      const { access } = await import('fs/promises');
      vi.mocked(access).mockImplementation((p) => {
        if (p === path.join(chunkDir, 'chunk-0.tmp')) return Promise.resolve(undefined);
        if (p === path.join(chunkDir, 'chunk-1.tmp')) return Promise.reject(new Error('Not found'));
        return Promise.resolve(undefined);
      });
      const result = await assembleChunks(baseTmpDir, uploadId, totalChunks, finalFilePath);
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(`Chunk 1 not found at ${path.join(chunkDir, 'chunk-1.tmp')}`);
      expect(mockWriteStream.end).toHaveBeenCalled(); // writeStream should be ended
    });

    it('should return false if readFile fails for a chunk', async () => {
      const { readFile } = await import('fs/promises');
      vi.mocked(readFile).mockRejectedValueOnce(new Error('Read error'));
      const result = await assembleChunks(baseTmpDir, uploadId, totalChunks, finalFilePath);
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith("Error assembling chunks:", expect.any(Error));
    });
    
    it('should return false if writeStream emits an error', async () => {
      const errorToSimulate = new Error('Stream write error test');
      // Configure the mockWriteStream (obtained from beforeEach) to simulate an error.
      mockWriteStream._shouldError = true;
      mockWriteStream._errorToEmit = errorToSimulate;
      
      const result = await assembleChunks(baseTmpDir, uploadId, totalChunks, finalFilePath);
      expect(result).toBe(false);
      // The error logged by assembleChunks should be passed as a separate parameter
      expect(console.error).toHaveBeenCalledWith("Error assembling chunks:", expect.any(Error));
    });

    it('should log warning if cleanup fails but still return true if assembly was successful', async () => {
      const { rmdir } = await import('fs/promises');
      vi.mocked(rmdir).mockRejectedValueOnce(new Error('Cleanup failed'));
      const result = await assembleChunks(baseTmpDir, uploadId, totalChunks, finalFilePath);
      expect(result).toBe(true); // Assembly itself was successful
      expect(console.warn).toHaveBeenCalledWith(`Warning: Could not clean up temporary directory ${chunkDir}:`, expect.any(Error));
      expect(console.log).toHaveBeenCalledWith(`File assembled successfully at ${finalFilePath}`);
    });
  });
});
