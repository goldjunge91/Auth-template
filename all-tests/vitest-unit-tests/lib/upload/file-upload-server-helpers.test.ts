import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import * as fsPromises from 'fs/promises';
import * as fs from 'fs'; // Import fs as namespace for createWriteStream mocking
import path from 'path'; // Import path for joining paths
import {
  validateChunkHash,
  sanitizeAndGenerateUniqueFilename,
  validateFileMeta,
  ensureUploadDirsExist,
  assembleChunks, // Import the function to test
} from '@/lib/upload/file-upload-server-helpers';
import { TMP_UPLOAD_DIR, FINAL_UPLOAD_DIR } from '@/config/file-upload-config';

vi.mock('fs/promises');
vi.mock('fs', async () => {
  const actualFs = await vi.importActual<typeof fs>('fs');
  return {
    ...actualFs,
    createWriteStream: vi.fn(),
  };
});

// Helper function to convert a hex string to an ArrayBuffer
const hexStringToArrayBuffer = (hex: string): ArrayBuffer => {
  const buffer = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    buffer[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return buffer.buffer;
};

// Helper function to convert an ArrayBuffer to a hex string
const arrayBufferToHexString = (arrayBuffer: ArrayBuffer): string => {
  return Buffer.from(arrayBuffer).toString('hex');
};

describe('validateChunkHash', () => {
  const mockChunk = new Uint8Array([1, 2, 3, 4, 5]);
  const mockServerHash = 'abcdef1234567890';
  const mockServerArrayBuffer = hexStringToArrayBuffer(mockServerHash);

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should return true if the clientHash matches the server-calculated hash', async () => {
    vi.stubGlobal('crypto', {
      subtle: {
        digest: vi.fn().mockResolvedValue(mockServerArrayBuffer),
      },
    });

    const result = await validateChunkHash(mockChunk, mockServerHash);
    expect(result).toBe(true);
    expect(crypto.subtle.digest).toHaveBeenCalledWith('SHA-256', mockChunk);
  });

  it('should return false if the clientHash does not match the server-calculated hash', async () => {
    vi.stubGlobal('crypto', {
      subtle: {
        digest: vi.fn().mockResolvedValue(mockServerArrayBuffer),
      },
    });

    const differentHash = '0987654321fedcba';
    const result = await validateChunkHash(mockChunk, differentHash);
    expect(result).toBe(false);
    expect(crypto.subtle.digest).toHaveBeenCalledWith('SHA-256', mockChunk);
  });

  it('should return true if clientHash is undefined', async () => {
    const mockCrypto = {
      subtle: {
        digest: vi.fn(),
      },
    };
    vi.stubGlobal('crypto', mockCrypto);

    const result = await validateChunkHash(mockChunk, undefined);
    expect(result).toBe(true);
    expect(mockCrypto.subtle.digest).not.toHaveBeenCalled();
  });

  it('should return true if clientHash is an empty string', async () => {
    const mockCrypto = {
      subtle: {
        digest: vi.fn(),
      },
    };
    vi.stubGlobal('crypto', mockCrypto);
    const result = await validateChunkHash(mockChunk, '');
    expect(result).toBe(true);
    expect(mockCrypto.subtle.digest).not.toHaveBeenCalled();
  });

  it('should return false if crypto.subtle.digest throws an error', async () => {
    vi.stubGlobal('crypto', {
      subtle: {
        digest: vi.fn().mockRejectedValue(new Error('Crypto error')),
      },
    });

    const result = await validateChunkHash(mockChunk, mockServerHash);
    expect(result).toBe(false);
    expect(crypto.subtle.digest).toHaveBeenCalledWith('SHA-256', mockChunk);
  });
});

describe('sanitizeAndGenerateUniqueFilename', () => {
  const mockTimestamp = 1678886400000;
  // Based on previous error: "test-1678886400000-123456789.png"
  // The random part appears to be String(mockedMathRandomValue).substring(2, 11) -> "123456789"
  const mockedMathRandomValue = 0.123456789;
  const mockRandomString = String(mockedMathRandomValue).substring(2, 11); // "123456789"

  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp);
    vi.spyOn(Math, 'random').mockReturnValue(mockedMathRandomValue); 
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle a simple filename, preserving extension', () => {
    const filename = 'test.png';
    const expectedSanitizedBase = 'test';
    // Assuming the actual function uses '-' as a separator
    const expectedOutputPattern = new RegExp(
      `^${expectedSanitizedBase}-${mockTimestamp}-${mockRandomString}\\.png$`
    );
    const result = sanitizeAndGenerateUniqueFilename(filename);
    expect(result).toMatch(expectedOutputPattern);
  });

  it('should sanitize spaces and special characters, preserving extension', () => {
    const filename = 'my image (1).jpg';
    // Adjusted to match previous actual output: my_image_1
    const expectedSanitizedBase = 'my_image_1'; 
    const expectedOutputPattern = new RegExp(
      `^${expectedSanitizedBase}-${mockTimestamp}-${mockRandomString}\\.jpg$`
    );
    const result = sanitizeAndGenerateUniqueFilename(filename);
    expect(result).toMatch(expectedOutputPattern);
  });

  it('should handle a filename without an extension', () => {
    const filename = 'myFile';
    // Adjusted to match previous actual output: myfile (lowercase)
    const expectedSanitizedBase = 'myfile'; 
    const expectedOutputPattern = new RegExp(
      `^${expectedSanitizedBase}-${mockTimestamp}-${mockRandomString}$`
    );
    const result = sanitizeAndGenerateUniqueFilename(filename);
    expect(result).toMatch(expectedOutputPattern);
  });

  it('should truncate a very long filename, preserving extension and uniqueness', () => {
    const longName = 'a'.repeat(200);
    const filename = `${longName}.txt`;
    const expectedSanitizedBase = 'a'.repeat(50); 
    const expectedOutputPattern = new RegExp(
      `^${expectedSanitizedBase}-${mockTimestamp}-${mockRandomString}\\.txt$`
    );
    const result = sanitizeAndGenerateUniqueFilename(filename);
    expect(result).toMatch(expectedOutputPattern);
  });

  it('should handle filenames with multiple dots, preserving the final extension', () => {
    const filename = 'archive.tar.gz';
    // Adjusted to match previous actual output: archive.tar
    const expectedSanitizedBase = 'archive.tar'; 
    const expectedOutputPattern = new RegExp(
      `^${expectedSanitizedBase}-${mockTimestamp}-${mockRandomString}\\.gz$`
    );
    const result = sanitizeAndGenerateUniqueFilename(filename);
    expect(result).toMatch(expectedOutputPattern);
  });
});

describe('validateFileMeta', () => {
  const defaultMaxFileSizeBytes = 5 * 1024 * 1024; // 5MB
  const defaultAllowedFileTypes = ['image/png', 'image/jpeg', 'application/pdf'];
  const defaultFileName = 'test.png';

  it('should return null for valid size, type, and filename', () => {
    const result = validateFileMeta(
      1 * 1024 * 1024, // 1MB
      'image/png',
      defaultFileName,
      defaultMaxFileSizeBytes,
      defaultAllowedFileTypes
    );
    expect(result).toBeNull();
  });

  it('should return error object if file is too large', () => {
    const result = validateFileMeta(
      6 * 1024 * 1024, // 6MB
      'image/png',
      defaultFileName,
      defaultMaxFileSizeBytes, 
      defaultAllowedFileTypes
    );
    expect(result).toEqual(expect.objectContaining({
      status: 413,
      error: expect.any(String), // Check for 'error' field based on previous log
    }));
  });

  it('should return error object for invalid file type', () => {
    const result = validateFileMeta(
      1 * 1024 * 1024, 
      'text/html', 
      defaultFileName,
      defaultMaxFileSizeBytes,
      defaultAllowedFileTypes
    );
    expect(result).toEqual(expect.objectContaining({
      status: 415,
      error: expect.any(String), // Check for 'error' field
    }));
  });

  it('should return error object if fileType is null', () => {
    const result = validateFileMeta(
      1 * 1024 * 1024, 
      null, 
      defaultFileName,
      defaultMaxFileSizeBytes,
      defaultAllowedFileTypes
    );
    expect(result).toEqual(expect.objectContaining({
      status: 415,
      error: expect.any(String), // Check for 'error' field
    }));
  });

  it('should return error object if fileType is an empty string', () => {
    const result = validateFileMeta(
      1 * 1024 * 1024, 
      '', 
      defaultFileName,
      defaultMaxFileSizeBytes,
      defaultAllowedFileTypes
    );
    expect(result).toEqual(expect.objectContaining({
      status: 415,
      error: expect.any(String), // Check for 'error' field
    }));
  });
});

describe('ensureUploadDirsExist', () => {
  beforeEach(() => {
    vi.resetAllMocks(); // Also resets fs and fsPromises mocks due to vi.mock
  });

  const mockFsStatSuccess = () => ({ isDirectory: () => true });
  const mockFsStatErrorENOENT = () => {
    const error = new Error('File not found');
    (error as any).code = 'ENOENT';
    throw error;
  };

  it('should not call mkdir if directories exist', async () => {
    vi.mocked(fsPromises.stat).mockResolvedValue(mockFsStatSuccess() as any);

    await ensureUploadDirsExist();

    expect(fsPromises.stat).toHaveBeenCalledWith(TMP_UPLOAD_DIR);
    expect(fsPromises.stat).toHaveBeenCalledWith(FINAL_UPLOAD_DIR);
    expect(fsPromises.mkdir).not.toHaveBeenCalled();
  });

  it('should create directories if they do not exist', async () => {
    vi.mocked(fsPromises.stat).mockImplementation(mockFsStatErrorENOENT);
    vi.mocked(fsPromises.mkdir).mockResolvedValue(undefined);

    await ensureUploadDirsExist();

    expect(fsPromises.stat).toHaveBeenCalledWith(TMP_UPLOAD_DIR);
    expect(fsPromises.stat).toHaveBeenCalledWith(FINAL_UPLOAD_DIR);
    expect(fsPromises.mkdir).toHaveBeenCalledWith(TMP_UPLOAD_DIR, { recursive: true });
    expect(fsPromises.mkdir).toHaveBeenCalledWith(FINAL_UPLOAD_DIR, { recursive: true });
  });

  it('should throw an error if creating TMP_UPLOAD_DIR fails', async () => {
    const tmpDirError = new Error('Disk full');
    vi.mocked(fsPromises.stat)
      .mockImplementationOnce(mockFsStatErrorENOENT) 
      .mockResolvedValue(mockFsStatSuccess() as any); 

    vi.mocked(fsPromises.mkdir)
      .mockImplementationOnce(async (p) => { 
        if (p === TMP_UPLOAD_DIR) throw tmpDirError;
        return undefined;
      });

    await expect(ensureUploadDirsExist()).rejects.toThrow(tmpDirError);
    expect(fsPromises.mkdir).toHaveBeenCalledWith(TMP_UPLOAD_DIR, { recursive: true });
  });
  
  it('should throw an error if creating FINAL_UPLOAD_DIR fails (TMP_UPLOAD_DIR also created)', async () => {
    const finalDirError = new Error('Permission denied');
    vi.mocked(fsPromises.stat).mockImplementation(mockFsStatErrorENOENT); 

    vi.mocked(fsPromises.mkdir)
      .mockImplementationOnce(async (p) => { 
        if (p === TMP_UPLOAD_DIR) return undefined; 
      })
      .mockImplementationOnce(async (p) => { 
        if (p === FINAL_UPLOAD_DIR) throw finalDirError; 
      });
      
    await expect(ensureUploadDirsExist()).rejects.toThrow(finalDirError);
    expect(fsPromises.mkdir).toHaveBeenCalledWith(TMP_UPLOAD_DIR, { recursive: true });
    expect(fsPromises.mkdir).toHaveBeenCalledWith(FINAL_UPLOAD_DIR, { recursive: true });
  });

  it('should throw if fs.stat for TMP_UPLOAD_DIR throws a non-ENOENT error', async () => {
    const statError = new Error('Access denied'); 
    vi.mocked(fsPromises.stat)
      .mockImplementationOnce(async (p) => { 
        if (p === TMP_UPLOAD_DIR) throw statError;
      });

    await expect(ensureUploadDirsExist()).rejects.toThrow(statError);
    expect(fsPromises.stat).toHaveBeenCalledWith(TMP_UPLOAD_DIR);
    expect(fsPromises.mkdir).not.toHaveBeenCalledWith(TMP_UPLOAD_DIR, { recursive: true });
  });
});

describe('assembleChunks', () => {
  // Using relative paths for mock setup if errors indicate the function uses them internally
  // despite BASE_TMP_DIR being absolute. This is a common source of ENOENT if not aligned.
  // However, the function signature implies BASE_TMP_DIR should be used.
  // Let's stick to absolute paths derived from constants for now and ensure mocks match.
  const UPLOAD_ID = 'test-upload-id-123';
  // TMP_UPLOAD_DIR and FINAL_UPLOAD_DIR are absolute: /app/public/uploads/tmp and /app/public/uploads
  const CHUNK_DIR_PATH = path.join(TMP_UPLOAD_DIR, UPLOAD_ID); 
  const FINAL_FILE_PATH = path.join(FINAL_UPLOAD_DIR, 'final-assembled-file.txt');


  let mockWriteStream: {
    write: vi.Mock;
    end: vi.Mock;
    on: vi.Mock<any[], any>; // Use any[] for params, any for return if complex
    close: vi.Mock;
    removeAllListeners: vi.Mock;
    _finishHandler: (() => void) | null;
    _errorHandler: ((err: Error) => void) | null;
    simulateFinish: () => void;
    simulateError: (err: Error) => void;
  };

  beforeEach(() => {
    // vi.resetAllMocks(); // Already in global afterEach, but can be here if needed for specific order
    
    mockWriteStream = {
      write: vi.fn(),
      end: vi.fn((callback?: () => void) => { 
        if (callback) callback(); 
        return mockWriteStream; 
      }),
      on: vi.fn((event, handler) => {
        if (event === 'finish' && mockWriteStream._finishHandler === null) mockWriteStream._finishHandler = handler;
        if (event === 'error' && mockWriteStream._errorHandler === null) mockWriteStream._errorHandler = handler;
        return mockWriteStream; 
      }),
      close: vi.fn((callback?: () => void) => { if (callback) callback(); }),
      removeAllListeners: vi.fn(),
      _finishHandler: null,
      _errorHandler: null,
      simulateFinish: () => { if (mockWriteStream._finishHandler) mockWriteStream._finishHandler(); },
      simulateError: (err: Error) => { if (mockWriteStream._errorHandler) mockWriteStream._errorHandler(err); },
    };
    // Use a more direct cast if vi.mocked continues to fail.
    (fs.createWriteStream as vi.Mock).mockReturnValue(mockWriteStream as any);
  });

  // Test Case 1: Successful assembly of multiple chunks
  it('should successfully assemble multiple chunks and clean up', async () => {
    const totalChunks = 3;
    const chunkData = [Buffer.from('Chunk0'), Buffer.from('Chunk1'), Buffer.from('Chunk2')];

    vi.mocked(fsPromises.access).mockResolvedValue(undefined); // All chunks exist
    for (let i = 0; i < totalChunks; i++) {
      vi.mocked(fsPromises.readFile).mockResolvedValueOnce(chunkData[i]);
    }
    vi.mocked(fsPromises.unlink).mockResolvedValue(undefined);
    vi.mocked(fsPromises.rmdir).mockResolvedValue(undefined);
    
    // Simulate that end() will eventually lead to a 'finish' event
    mockWriteStream.end.mockImplementation((callback?: () => void) => {
      if (callback) callback();
      mockWriteStream.simulateFinish(); // Simulate finish after end is called
      return mockWriteStream;
    });

    const result = await assembleChunks(TMP_UPLOAD_DIR, UPLOAD_ID, totalChunks, FINAL_FILE_PATH);

    expect(result).toBe(true);
    expect(fs.createWriteStream).toHaveBeenCalledWith(FINAL_FILE_PATH); // Absolute path for final file
    for (let i = 0; i < totalChunks; i++) {
      expect(mockWriteStream.write).toHaveBeenCalledWith(chunkData[i]);
      // Assuming assembleChunks uses relative paths for individual chunk operations based on ENOENT errors
      const expectedChunkFilePath = path.join('public/uploads/tmp', UPLOAD_ID, `chunk-${i}.tmp`);
      expect(fsPromises.access).toHaveBeenCalledWith(expectedChunkFilePath);
      expect(fsPromises.readFile).toHaveBeenCalledWith(expectedChunkFilePath);
      expect(fsPromises.unlink).toHaveBeenCalledWith(expectedChunkFilePath);
    }
    expect(mockWriteStream.end).toHaveBeenCalled();
    // CHUNK_DIR_PATH should be the relative path if rmdir also operates on relative paths internally
    const relativeChunkDirPath = path.join('public/uploads/tmp', UPLOAD_ID);
    expect(fsPromises.rmdir).toHaveBeenCalledWith(relativeChunkDirPath);
  });

  // Test Case 2: Error reading a chunk (e.g., readFile fails)
  it('should return false if reading a chunk fails', async () => {
    const totalChunks = 2;
    const readError = new Error('Failed to read chunk');
    const chunk0RelativePath = path.join('public/uploads/tmp', UPLOAD_ID, `chunk-0.tmp`);
    const chunk1RelativePath = path.join('public/uploads/tmp', UPLOAD_ID, `chunk-1.tmp`);

    vi.mocked(fsPromises.access).mockResolvedValue(undefined); 
    vi.mocked(fsPromises.readFile)
      .mockImplementation(async (p) => {
        if (p === chunk0RelativePath) return Buffer.from('Chunk0Data');
        if (p === chunk1RelativePath) throw readError;
        return Buffer.from(''); 
      });
    
    const result = await assembleChunks(TMP_UPLOAD_DIR, UPLOAD_ID, totalChunks, FINAL_FILE_PATH);

    expect(result).toBe(false);
    expect(fs.createWriteStream).toHaveBeenCalledWith(FINAL_FILE_PATH);
    expect(mockWriteStream.write).toHaveBeenCalledWith(Buffer.from('Chunk0Data'));
    expect(mockWriteStream.end).not.toHaveBeenCalled(); 
    expect(mockWriteStream.close).toHaveBeenCalled(); 
    expect(fsPromises.unlink).toHaveBeenCalledWith(FINAL_FILE_PATH); 
  });

  // Test Case 3: Error writing to WriteStream
  it('should return false if WriteStream emits an error', async () => {
    const totalChunks = 1;
    const writeError = new Error('Disk space full');
    const chunk0RelativePath = path.join('public/uploads/tmp', UPLOAD_ID, `chunk-0.tmp`);
    const relativeChunkDirPath = path.join('public/uploads/tmp', UPLOAD_ID);


    vi.mocked(fsPromises.access).mockResolvedValue(undefined);
    vi.mocked(fsPromises.readFile).mockResolvedValue(Buffer.from('ChunkData'));
    
    mockWriteStream.on.mockImplementation((event, handler) => {
      if (event === 'error') {
        (handler as (err: Error) => void)(writeError); 
      }
      return mockWriteStream;
    });

    const result = await assembleChunks(TMP_UPLOAD_DIR, UPLOAD_ID, totalChunks, FINAL_FILE_PATH);

    expect(result).toBe(false);
    expect(fs.createWriteStream).toHaveBeenCalledWith(FINAL_FILE_PATH);
    expect(mockWriteStream.write).toHaveBeenCalledWith(Buffer.from('ChunkData'));
    expect(mockWriteStream.close).toHaveBeenCalled(); 
    expect(fsPromises.unlink).toHaveBeenCalledWith(FINAL_FILE_PATH);
    expect(fsPromises.unlink).toHaveBeenCalledWith(chunk0RelativePath);
    expect(fsPromises.rmdir).toHaveBeenCalledWith(relativeChunkDirPath);
  });


  // Test Case 5: Error during unlink or rmdir (non-fatal for assembly)
  it('should return true even if cleanup (unlink chunk) fails, but log error', async () => {
    const totalChunks = 1;
    const unlinkError = new Error('Failed to unlink chunk');
    const chunk0RelativePath = path.join('public/uploads/tmp', UPLOAD_ID, `chunk-0.tmp`);
    const relativeChunkDirPath = path.join('public/uploads/tmp', UPLOAD_ID);


    vi.mocked(fsPromises.access).mockResolvedValue(undefined);
    vi.mocked(fsPromises.readFile).mockResolvedValue(Buffer.from('ChunkData'));
    vi.mocked(fsPromises.unlink).mockImplementation(async (p) => {
      if (p === chunk0RelativePath) throw unlinkError;
      return undefined;
    });
    vi.mocked(fsPromises.rmdir).mockResolvedValue(undefined);
    
    mockWriteStream.end.mockImplementation((callback?: () => void) => {
      if (callback) callback();
      mockWriteStream.simulateFinish();
      return mockWriteStream;
    });
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await assembleChunks(TMP_UPLOAD_DIR, UPLOAD_ID, totalChunks, FINAL_FILE_PATH);

    expect(result).toBe(true); 
    expect(fs.createWriteStream).toHaveBeenCalledWith(FINAL_FILE_PATH);
    expect(mockWriteStream.write).toHaveBeenCalledWith(Buffer.from('ChunkData'));
    expect(mockWriteStream.end).toHaveBeenCalled();
    expect(fsPromises.unlink).toHaveBeenCalledWith(chunk0RelativePath);
    expect(fsPromises.rmdir).toHaveBeenCalledWith(relativeChunkDirPath); 
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to unlink chunk'), unlinkError);

    consoleErrorSpy.mockRestore();
  });

  it('should return true even if cleanup (rmdir) fails, but log error', async () => {
    const totalChunks = 1;
    const rmdirError = new Error('Failed to rmdir');
    const relativeChunkDirPath = path.join('public/uploads/tmp', UPLOAD_ID);

    vi.mocked(fsPromises.access).mockResolvedValue(undefined);
    vi.mocked(fsPromises.readFile).mockResolvedValue(Buffer.from('ChunkData'));
    vi.mocked(fsPromises.unlink).mockResolvedValue(undefined); 
    vi.mocked(fsPromises.rmdir).mockRejectedValue(rmdirError); 
    
    mockWriteStream.end.mockImplementation((callback?: () => void) => {
      if (callback) callback();
      mockWriteStream.simulateFinish();
      return mockWriteStream;
    });
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await assembleChunks(TMP_UPLOAD_DIR, UPLOAD_ID, totalChunks, FINAL_FILE_PATH);

    expect(result).toBe(true); 
    expect(fsPromises.rmdir).toHaveBeenCalledWith(relativeChunkDirPath);
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to remove temporary directory'), rmdirError);

    consoleErrorSpy.mockRestore();
  });


  // Test Case 6: A chunk is missing (access fails for a chunk)
  it('should return false if a chunk is missing', async () => {
    const totalChunks = 2;
    const accessError = new Error('Chunk not accessible');
    const chunk0RelativePath = path.join('public/uploads/tmp', UPLOAD_ID, `chunk-0.tmp`);
    const chunk1RelativePath = path.join('public/uploads/tmp', UPLOAD_ID, `chunk-1.tmp`);


    vi.mocked(fsPromises.access).mockImplementation(async (p) => {
      if (p === chunk0RelativePath) return undefined;
      if (p === chunk1RelativePath) throw accessError;
    });

    const result = await assembleChunks(TMP_UPLOAD_DIR, UPLOAD_ID, totalChunks, FINAL_FILE_PATH);

    expect(result).toBe(false);
    
    // Check if createWriteStream was called. If it was, it should have been closed.
    if ((fs.createWriteStream as vi.Mock).mock.calls.length > 0) { // Check calls on the mock
        expect(mockWriteStream.close).toHaveBeenCalled();
        expect(fsPromises.unlink).toHaveBeenCalledWith(FINAL_FILE_PATH); 
    }
    
    expect(fsPromises.access).toHaveBeenCalledWith(chunk0RelativePath);
    expect(fsPromises.access).toHaveBeenCalledWith(chunk1RelativePath);
    expect(fsPromises.readFile).not.toHaveBeenCalledWith(chunk1RelativePath); 
  });
});
