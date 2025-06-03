import type { ClientUploadedFileData } from "uploadthing/types";

/**
 * Represents an uploaded file, extending the base `ClientUploadedFileData`
 * from UploadThing with application-specific properties.
 *
 * "Erweitere den UploadedFile-Typ, um mit unserem Schema kompatibel zu sein"
 * (Extends the UploadedFile type to be compatible with our schema)
 *
 * @template T - Generic type parameter for custom data, defaults to `unknown`.
 * @property {string} [fileUrl] - The direct URL to the uploaded file. Often the same as `url` from `ClientUploadedFileData`.
 * @property {string} [fileName] - The name of the file. Often the same as `name` from `ClientUploadedFileData`.
 * @property {string} [fileHash] - A hash of the file content, potentially used for integrity checking or deduplication.
 */
export type UploadedFile<T = unknown> = ClientUploadedFileData<T> & {
  /** The direct URL to the uploaded file. Often the same as `url` from `ClientUploadedFileData`. */
  fileUrl?: string;
  /** The name of the file. Often the same as `name` from `ClientUploadedFileData`. */
  fileName?: string;
  /** A hash of the file content, potentially used for integrity checking or deduplication. */
  fileHash?: string;
};
