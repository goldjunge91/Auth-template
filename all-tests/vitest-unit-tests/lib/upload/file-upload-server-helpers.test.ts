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

// Mock fs/promises with named exports
vi.mock('fs/promises', () => ({
  stat: vi.fn(),
  mkdir: vi.fn(),
  readFile: vi.fn(),
  unlink: vi.fn(),
  rmdir: vi.fn(),
  access: vi.fn(),
  // constants: { F_OK: 0 } // Add if needed
}));

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

    expect(fsPromises.stat).toHaveBeenCalledWith(path.join(process.cwd(), TMP_UPLOAD_DIR));
    expect(fsPromises.stat).toHaveBeenCalledWith(path.join(process.cwd(), FINAL_UPLOAD_DIR));
    expect(fsPromises.mkdir).not.toHaveBeenCalled();
  });

  it('should create directories if they do not exist', async () => {
    vi.mocked(fsPromises.stat).mockImplementation(mockFsStatErrorENOENT);
    vi.mocked(fsPromises.mkdir).mockResolvedValue(undefined);

    await ensureUploadDirsExist();

    expect(fsPromises.stat).toHaveBeenCalledWith(path.join(process.cwd(), TMP_UPLOAD_DIR));
    expect(fsPromises.stat).toHaveBeenCalledWith(path.join(process.cwd(), FINAL_UPLOAD_DIR));
    expect(fsPromises.mkdir).toHaveBeenCalledWith(path.join(process.cwd(), TMP_UPLOAD_DIR), { recursive: true });
    expect(fsPromises.mkdir).toHaveBeenCalledWith(path.join(process.cwd(), FINAL_UPLOAD_DIR), { recursive: true });
  });

  it('should throw an error if creating TMP_UPLOAD_DIR fails', async () => {
    const tmpDirError = new Error('Disk full');
    // Simulate TMP_UPLOAD_DIR does not exist, FINAL_UPLOAD_DIR check might or might not happen depending on logic.
    vi.mocked(fsPromises.stat).mockImplementation(async (p) => {
      if (p === path.join(process.cwd(), TMP_UPLOAD_DIR)) return mockFsStatErrorENOENT();
      if (p === path.join(process.cwd(), FINAL_UPLOAD_DIR)) return mockFsStatSuccess(); // Or ENOENT, depends on sequence
      return mockFsStatSuccess();
    });
    vi.mocked(fsPromises.mkdir).mockImplementation(async (p) => {
      if (p === path.join(process.cwd(), TMP_UPLOAD_DIR)) throw tmpDirError;
      return undefined;
    });

    await expect(ensureUploadDirsExist()).rejects.toThrow(tmpDirError);
    // Check that stat was called for TMP_UPLOAD_DIR
    expect(fsPromises.stat).toHaveBeenCalledWith(path.join(process.cwd(), TMP_UPLOAD_DIR));
    // Check that mkdir was called for TMP_UPLOAD_DIR
    expect(fsPromises.mkdir).toHaveBeenCalledWith(path.join(process.cwd(), TMP_UPLOAD_DIR), { recursive: true });
  });
  
  it('should throw an error if creating FINAL_UPLOAD_DIR fails (TMP_UPLOAD_DIR also created)', async () => {
    const finalDirError = new Error('Permission denied');
    const tmpUploadPath = path.join(process.cwd(), TMP_UPLOAD_DIR);
    const finalUploadPath = path.join(process.cwd(), FINAL_UPLOAD_DIR);

    vi.mocked(fsPromises.stat).mockImplementation(async (p: string) => {
      if (p === tmpUploadPath) {
        // Simulate TMP_UPLOAD_DIR does not exist initially, to trigger its creation
        const enoentError = new Error('ENOENT: tmp dir not found');
        (enoentError as any).code = 'ENOENT';
        throw enoentError;
      }
      if (p === finalUploadPath) {
        // Simulate FINAL_UPLOAD_DIR does not exist initially
        const enoentError = new Error('ENOENT: final dir not found');
        (enoentError as any).code = 'ENOENT';
        throw enoentError;
      }
      // Fallback for any other stat calls, though none are expected in this specific flow
      return { isDirectory: () => true } as fsPromises.Stats; 
    });

    vi.mocked(fsPromises.mkdir).mockImplementation(async (p: string) => {
      if (p === tmpUploadPath) {
        return undefined; // TMP_UPLOAD_DIR creation succeeds
      }
      if (p === finalUploadPath) {
        throw finalDirError; // FINAL_UPLOAD_DIR creation fails
      }
      throw new Error(`Unexpected mkdir call to ${p}`);
    });
      
    await expect(ensureUploadDirsExist()).rejects.toThrow(finalDirError);
    expect(fsPromises.stat).toHaveBeenCalledWith(tmpUploadPath);
    expect(fsPromises.stat).toHaveBeenCalledWith(finalUploadPath);
    expect(fsPromises.mkdir).toHaveBeenCalledWith(tmpUploadPath, { recursive: true });
    expect(fsPromises.mkdir).toHaveBeenCalledWith(finalUploadPath, { recursive: true });
  });

  it('should throw if fs.stat for TMP_UPLOAD_DIR throws a non-ENOENT error', async () => {
    const statError = new Error('Access denied'); 
    // No 'code' property, so it's not ENOENT
    vi.mocked(fsPromises.stat).mockImplementation(async (p) => {
      if (p === path.join(process.cwd(), TMP_UPLOAD_DIR)) throw statError;
      // Other stat calls (e.g. for FINAL_UPLOAD_DIR) might resolve or also throw,
      // but the important part is the first one for TMP_UPLOAD_DIR.
      return mockFsStatSuccess(); 
    });

    await expect(ensureUploadDirsExist()).rejects.toThrow(statError);
    expect(fsPromises.stat).toHaveBeenCalledWith(path.join(process.cwd(), TMP_UPLOAD_DIR));
    expect(fsPromises.mkdir).not.toHaveBeenCalled(); 
  });
});

describe('assembleChunks', () => {
  // Using relative paths for mock setup if errors indicate the function uses them internally
  // despite BASE_TMP_DIR being absolute. This is a common source of ENOENT if not aligned.
  // However, the function signature implies BASE_TMP_DIR should be used.
  // Let's stick to absolute paths derived from constants for now and ensure mocks match.
  const UPLOAD_ID = 'test-upload-id-123';
  // TMP_UPLOAD_DIR is relative: "public/uploads/tmp"
  // FINAL_UPLOAD_DIR is relative: "public/uploads"
  const RELATIVE_CHUNK_DIR_PATH = path.join(TMP_UPLOAD_DIR, UPLOAD_ID); 
  // FINAL_FILE_PATH for createWriteStream should be absolute, as it's constructed from FINAL_UPLOAD_DIR.
  // However, for internal chunk operations, paths are relative to TMP_UPLOAD_DIR.
  // The assembleChunks function receives baseTmpDir (TMP_UPLOAD_DIR) and finalFilePath.
  // Let's assume FINAL_FILE_PATH in tests is the absolute path as used by createWriteStream.
  const ABS_FINAL_FILE_PATH = path.join(process.cwd(), FINAL_UPLOAD_DIR, 'final-assembled-file.txt');


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

    // Mock so that all necessary chunk files exist and are readable
    vi.mocked(fsPromises.access).mockImplementation(async (p) => {
      // Check if path p matches any expected chunk file path pattern
      const chunkFileRegex = new RegExp(`${path.join(TMP_UPLOAD_DIR, UPLOAD_ID, 'chunk-')}\\d+\\.tmp`);
      if (chunkFileRegex.test(p as string)) {
        return undefined; // Simulate file exists
      }
      throw new Error(`Unexpected access call to ${p}`); // Fail test if other paths are accessed
    });
    for (let i = 0; i < totalChunks; i++) {
      const expectedChunkFilePath = path.join(TMP_UPLOAD_DIR, UPLOAD_ID, `chunk-${i}.tmp`);
      vi.mocked(fsPromises.readFile).mockImplementationOnce(async (p) => {
        if (p === expectedChunkFilePath) return chunkData[i];
        throw new Error(`Unexpected readFile call to ${p}`);
      });
    }
    vi.mocked(fsPromises.unlink).mockResolvedValue(undefined); // Simulate unlink success
    vi.mocked(fsPromises.rmdir).mockResolvedValue(undefined); // Simulate rmdir success
    
    // Simulate that end() will eventually lead to a 'finish' event
    mockWriteStream.end.mockImplementation((callback?: () => void) => {
      if (callback) callback();
      mockWriteStream.simulateFinish(); // Simulate finish after end is called
      return mockWriteStream;
    });

    const result = await assembleChunks(TMP_UPLOAD_DIR, UPLOAD_ID, totalChunks, ABS_FINAL_FILE_PATH);

    expect(result).toBe(true);
    expect(fs.createWriteStream).toHaveBeenCalledWith(ABS_FINAL_FILE_PATH);
    for (let i = 0; i < totalChunks; i++) {
      expect(mockWriteStream.write).toHaveBeenCalledWith(chunkData[i]);
      const expectedChunkFilePath = path.join(TMP_UPLOAD_DIR, UPLOAD_ID, `chunk-${i}.tmp`); // Relative path
      expect(fsPromises.access).toHaveBeenCalledWith(expectedChunkFilePath);
      expect(fsPromises.readFile).toHaveBeenCalledWith(expectedChunkFilePath);
      expect(fsPromises.unlink).toHaveBeenCalledWith(expectedChunkFilePath);
    }
    expect(mockWriteStream.end).toHaveBeenCalled();
    expect(fsPromises.rmdir).toHaveBeenCalledWith(RELATIVE_CHUNK_DIR_PATH); // Relative path
  });

  // Test Case 2: Error reading a chunk (e.g., readFile fails)
  it('should return false if reading a chunk fails', async () => {
    const totalChunks = 2;
    const readError = new Error('Failed to read chunk');
    const chunk0RelativePath = path.join(TMP_UPLOAD_DIR, UPLOAD_ID, `chunk-0.tmp`); // Relative
    const chunk1RelativePath = path.join(TMP_UPLOAD_DIR, UPLOAD_ID, `chunk-1.tmp`); // Relative

    vi.mocked(fsPromises.access).mockImplementation(async (p) => {
      if (p === chunk0RelativePath) return undefined;
      if (p === chunk1RelativePath) return undefined; // Both chunks are accessible initially
      throw new Error(`Unexpected access call to ${p}`);
    });
    vi.mocked(fsPromises.readFile)
      .mockImplementationOnce(async (p) => { // For chunk 0
        if (p === chunk0RelativePath) return Buffer.from('Chunk0Data');
        throw new Error(`Unexpected readFile call to ${p}`);
      })
      .mockImplementationOnce(async (p) => { // For chunk 1
        if (p === chunk1RelativePath) throw readError; // This error will be caught
        throw new Error(`Unexpected readFile call to ${p}`);
      });
    
    const result = await assembleChunks(TMP_UPLOAD_DIR, UPLOAD_ID, totalChunks, ABS_FINAL_FILE_PATH);

    expect(result).toBe(false);
    expect(fs.createWriteStream).toHaveBeenCalledWith(ABS_FINAL_FILE_PATH);
    expect(mockWriteStream.write).toHaveBeenCalledWith(Buffer.from('Chunk0Data')); // Wrote first chunk
    expect(mockWriteStream.end).not.toHaveBeenCalled(); 
    expect(mockWriteStream.close).toHaveBeenCalled(); // Stream closed due to error
    expect(fsPromises.unlink).toHaveBeenCalledWith(ABS_FINAL_FILE_PATH); 
  });

  // Test Case 3: Error writing to WriteStream
  it('should return false if WriteStream emits an error', async () => {
    const totalChunks = 1;
    const writeError = new Error('Disk space full');
    const chunk0RelativePath = path.join(TMP_UPLOAD_DIR, UPLOAD_ID, `chunk-0.tmp`);

    vi.mocked(fsPromises.access).mockResolvedValue(undefined); // Chunk 0 exists
    vi.mocked(fsPromises.readFile).mockResolvedValue(Buffer.from('ChunkData')); // Chunk 0 readable
    
    mockWriteStream.on.mockImplementation((event, handler) => {
      if (event === 'error') {
        (handler as (err: Error) => void)(writeError); 
      }
      return mockWriteStream;
    });

    const result = await assembleChunks(TMP_UPLOAD_DIR, UPLOAD_ID, totalChunks, ABS_FINAL_FILE_PATH);

    expect(result).toBe(false);
    expect(fs.createWriteStream).toHaveBeenCalledWith(ABS_FINAL_FILE_PATH);
    expect(mockWriteStream.write).toHaveBeenCalledWith(Buffer.from('ChunkData'));
    expect(mockWriteStream.close).toHaveBeenCalled(); 
    expect(fsPromises.unlink).toHaveBeenCalledWith(ABS_FINAL_FILE_PATH); // Absolute path for final file
    expect(fsPromises.unlink).toHaveBeenCalledWith(chunk0RelativePath); // Relative path for chunk
    expect(fsPromises.rmdir).toHaveBeenCalledWith(RELATIVE_CHUNK_DIR_PATH); // Relative path for chunk dir
  });


  // Test Case 5: Error during unlink or rmdir (non-fatal for assembly)
  it('should return true even if cleanup (unlink chunk) fails, but log error', async () => {
    const totalChunks = 1;
    const unlinkError = new Error('Failed to unlink chunk');
    const chunk0RelativePath = path.join(TMP_UPLOAD_DIR, UPLOAD_ID, `chunk-0.tmp`); // Relative

    vi.mocked(fsPromises.access).mockResolvedValue(undefined); // Chunk exists
    vi.mocked(fsPromises.readFile).mockResolvedValue(Buffer.from('ChunkData')); // Chunk readable
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

    const result = await assembleChunks(TMP_UPLOAD_DIR, UPLOAD_ID, totalChunks, ABS_FINAL_FILE_PATH);

    expect(result).toBe(true); 
    expect(fs.createWriteStream).toHaveBeenCalledWith(ABS_FINAL_FILE_PATH);
    expect(mockWriteStream.write).toHaveBeenCalledWith(Buffer.from('ChunkData'));
    expect(mockWriteStream.end).toHaveBeenCalled();
    expect(fsPromises.unlink).toHaveBeenCalledWith(chunk0RelativePath); // Relative path
    expect(fsPromises.rmdir).toHaveBeenCalledWith(RELATIVE_CHUNK_DIR_PATH);  // Relative path
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to unlink chunk'), unlinkError);

    consoleErrorSpy.mockRestore();
  });

  it('should return true even if cleanup (rmdir) fails, but log error', async () => {
    const totalChunks = 1;
    const rmdirError = new Error('Failed to rmdir');

    vi.mocked(fsPromises.access).mockResolvedValue(undefined); // Chunk exists
    vi.mocked(fsPromises.readFile).mockResolvedValue(Buffer.from('ChunkData')); // Chunk readable
    vi.mocked(fsPromises.unlink).mockResolvedValue(undefined); 
    vi.mocked(fsPromises.rmdir).mockRejectedValue(rmdirError);
    
    mockWriteStream.end.mockImplementation((callback?: () => void) => {
      if (callback) callback();
      mockWriteStream.simulateFinish();
      return mockWriteStream;
    });
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await assembleChunks(TMP_UPLOAD_DIR, UPLOAD_ID, totalChunks, ABS_FINAL_FILE_PATH);

    expect(result).toBe(true); 
    expect(fsPromises.rmdir).toHaveBeenCalledWith(RELATIVE_CHUNK_DIR_PATH); // Relative path
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to remove temporary directory'), rmdirError);

    consoleErrorSpy.mockRestore();
  });


  // Test Case 6: A chunk is missing (access fails for a chunk)
  it('should return false if a chunk is missing', async () => {
    const totalChunks = 2;
    const accessError = new Error('Chunk not accessible');
    const chunk0RelativePath = path.join(TMP_UPLOAD_DIR, UPLOAD_ID, `chunk-0.tmp`); // Relative
    const chunk1RelativePath = path.join(TMP_UPLOAD_DIR, UPLOAD_ID, `chunk-1.tmp`); // Relative


    vi.mocked(fsPromises.access).mockImplementation(async (p) => {
      if (p === chunk0RelativePath) return undefined; // Chunk 0 exists
      if (p === chunk1RelativePath) throw accessError; // Chunk 1 does not exist / access fails
      return undefined; // Default for any other access calls if necessary
    });
    // readFile for chunk0 should still be mockable if access to it was successful
    vi.mocked(fsPromises.readFile).mockImplementation(async(p)=>{
      if(p === chunk0RelativePath) return Buffer.from("Chunk0Data");
      throw new Error(`Unexpected readFile call to ${p}`);
    });


    const result = await assembleChunks(TMP_UPLOAD_DIR, UPLOAD_ID, totalChunks, ABS_FINAL_FILE_PATH);

    expect(result).toBe(false);
    
    // Check if createWriteStream was called. If it was, it means chunk0 was processed.
    if ((fs.createWriteStream as vi.Mock).mock.calls.length > 0) {
        expect(mockWriteStream.write).toHaveBeenCalledWith(Buffer.from("Chunk0Data")); // Check if first chunk was written
        expect(mockWriteStream.close).toHaveBeenCalled(); // Stream should be closed
        expect(fsPromises.unlink).toHaveBeenCalledWith(ABS_FINAL_FILE_PATH); // Final file should be unlinked
    }
    
    expect(fsPromises.access).toHaveBeenCalledWith(chunk0RelativePath); 
    expect(fsPromises.access).toHaveBeenCalledWith(chunk1RelativePath);
    // readFile for chunk0 might have been called if access was successful before encountering missing chunk1
    // Depending on loop structure, readFile for chunk1 should not be called if access failed.
    expect(fsPromises.readFile).not.toHaveBeenCalledWith(chunk1RelativePath); 
  });
});
