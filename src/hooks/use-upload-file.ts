import type { UploadedFile } from "@/types";
import * as React from "react";
import { toast } from "sonner";
import type { AnyFileRoute, UploadFilesOptions } from "uploadthing/types";

import type { OurFileRouter } from "@/app/api/uploadthing/core";
import { uploadFiles } from "@/lib/uploadthing/uploadthing";
import { UploadThingError } from "uploadthing/server";

/**
 * Options for the `useUploadFile` hook.
 * @template TFileRoute - The type of the file route.
 */
interface UseUploadFileOptions<TFileRoute extends AnyFileRoute>
  extends Pick<
    UploadFilesOptions<TFileRoute>,
    "headers" | "onUploadBegin" | "onUploadProgress" | "skipPolling"
  > {
  /**
   * An optional array of files that are already uploaded by default.
   * @default []
   */
  defaultUploadedFiles?: UploadedFile[];
}

/**
 * A custom React hook for handling file uploads using UploadThing.
 *
 * @template TFileRoute - The specific file route from `OurFileRouter`.
 * @param endpoint - The key of the file route in `OurFileRouter` to upload to.
 * @param options - Optional configuration for the upload process.
 * @returns An object containing:
 *  - `onUpload`: A function to initiate the upload of an array of `File` objects.
 *  - `uploadedFiles`: An array of `UploadedFile` objects representing successfully uploaded files.
 *  - `progresses`: A record mapping file names to their upload progress (0-100).
 *  - `isUploading`: A boolean indicating if an upload is currently in progress.
 */
export function useUploadFile<TFileRoute extends keyof OurFileRouter>(
  endpoint: TFileRoute,
  {
    defaultUploadedFiles = [],
    ...props
  }: UseUploadFileOptions<OurFileRouter[TFileRoute]> = {},
) {
  const [uploadedFiles, setUploadedFiles] =
    React.useState<UploadedFile[]>(defaultUploadedFiles);
  const [progresses, setProgresses] = React.useState<Record<string, number>>(
    {},
  );
  const [isUploading, setIsUploading] = React.useState(false);

  /**
   * Initiates the upload of the provided files.
   * @param files - An array of `File` objects to upload.
   */
  async function onUpload(files: File[]) {
    setIsUploading(true);
    try {
      const res = await uploadFiles(endpoint, {
        ...props,
        files,
        onUploadProgress: ({ file, progress }) => {
          setProgresses((prev) => {
            return {
              ...prev,
              [file.name]: progress,
            };
          });
        },
      });

      setUploadedFiles((prev) => (prev ? [...prev, ...res] : res));
    } catch (error) {
      if (error instanceof UploadThingError) {
        const errorMessage =
          error.data && "error" in error.data
            ? (error.data.error as string) // Type assertion for safety
            : "Upload failed";
        toast.error(errorMessage);
        return;
      }

      toast.error(
        error instanceof Error ? error.message : "An unknown error occurred",
      );
    } finally {
      setProgresses({});
      setIsUploading(false);
    }
  }

  return {
    onUpload,
    uploadedFiles,
    progresses,
    isUploading,
  };
}
