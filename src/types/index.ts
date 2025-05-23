import type { ClientUploadedFileData } from "uploadthing/types";

// Erweitere den UploadedFile-Typ, um mit unserem Schema kompatibel zu sein
export type UploadedFile<T = unknown> = ClientUploadedFileData<T> & {
  fileUrl?: string;
  fileName?: string;
  fileHash?: string;
};
