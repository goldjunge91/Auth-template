// File size limits
export const MAX_FILE_SIZE = 1024 * 1024 * 10; // 10MB - reduced from 100MB for better user experience
export const DEFAULT_MAX_SIZE_MB = 10; // Default max size in MB for client-side validation

// Chunk configuration
export const DEFAULT_CHUNK_SIZE = 1024 * 1024; // 1MB default chunk size
export const MIN_CHUNK_SIZE = 512 * 1024; // 256KB minimum chunk size
export const MAX_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB maximum chunk size

// Allowed file types
export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "application/pdf",
];

// File type groups for easier client-side validation
export const FILE_TYPE_GROUPS = {
  images: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  videos: ["video/mp4", "video/quicktime"],
  documents: ["application/pdf"],
};

// Upload directories
export const TMP_UPLOAD_DIR = "public/uploads/tmp";
export const FINAL_UPLOAD_DIR = "public/uploads";

// User-friendly error messages
export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: (filename: string, maxSize: number) =>
    `The file "${filename}" exceeds the maximum allowed size of ${maxSize}MB.`,
  UNSUPPORTED_FILE_TYPE: (filename: string, allowedTypes: string[]) =>
    `The file "${filename}" is not a supported file type. Please upload one of the following: ${allowedTypes.join(", ")}.`,
  UPLOAD_FAILED: "The upload failed. Please try again.",
  NETWORK_ERROR: "A network error occurred. Please check your connection and try again.",
  SERVER_ERROR: "The server encountered an error. Please try again later.",
  CHUNK_FAILED: "A part of your file failed to upload. Please try again.",
  ASSEMBLY_FAILED: "Your file was uploaded but could not be processed. Please try again.",
  HASH_MISMATCH: "File integrity check failed. The file may be corrupted. Please try again.",
};
