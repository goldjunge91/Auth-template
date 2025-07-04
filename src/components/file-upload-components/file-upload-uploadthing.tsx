"use client";

import { Button } from "@/components/ui/button";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadItemProgress,
  FileUploadList,
  FileUploadTrigger,
} from "@/components/ui/file-upload";
import { uploadFiles } from "@/lib/uploadthing/uploadthing";
import type { UploadedFile } from "@/types";
import { Upload, X } from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { toast } from "sonner";
import { UploadThingError } from "uploadthing/server";

export function FileUploadUploadThing() {
  const [isUploading, setIsUploading] = React.useState(false);
  const [files, setFiles] = React.useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([]);
  const onUpload = React.useCallback(
    async (
      files: File[],
      {
        onProgress,
      }: {
        onProgress: (file: File, progress: number) => void;
      },
    ) => {
      try {
        setIsUploading(true);
        const res = await uploadFiles("imageUploader", {
          files,
          onUploadProgress: ({ file, progress }) => {
            onProgress(file, progress);
          },
        });

        // Map UploadThing's response to our UploadedFile type
        const mappedRes: UploadedFile[] = res.map(uploadThingFile => ({
          key: uploadThingFile.key,
          name: uploadThingFile.name,
          size: uploadThingFile.size,
          url: uploadThingFile.url, // Store original uploadthing URL
          ufsUrl: uploadThingFile.url, // Use the same URL for ufsUrl for display consistency
          type: files.find(f => f.name === uploadThingFile.name)?.type || '', // Try to get type from original files
          serverData: uploadThingFile.serverData,
          customId: uploadThingFile.customId,
          // Provide default values for other fields if UploadedFile expects them
          appUrl: '',
          fileHash: '',
        }));

        setUploadedFiles((prev) => [...prev, ...mappedRes]);

        toast.success("Uploaded files:", {
          description: (
            <pre className="mt-2 w-80 rounded-md bg-accent/30 p-4 text-accent-foreground">
              <code>
                {JSON.stringify(
                  res.map((file) =>
                    file.name.length > 25
                      ? `${file.name.slice(0, 25)}...`
                      : file.name,
                  ),
                  null,
                  2,
                )}
              </code>
            </pre>
          ),
        });
      } catch (error) {
        setIsUploading(false);

        if (error instanceof UploadThingError) {
          const errorMessage =
            error.data && "error" in error.data
              ? error.data.error
              : "Upload failed";
          toast.error(errorMessage);
          return;
        }

        toast.error(
          error instanceof Error ? error.message : "An unknown error occurred",
        );
      } finally {
        setIsUploading(false);
      }
    },
    [],
  );

  const onFileReject = React.useCallback((file: File, message: string) => {
    toast(message, {
      description: `"${
        file.name.length > 20 ? `${file.name.slice(0, 20)}...` : file.name
      }" has been rejected`,
    });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <FileUpload
        accept="image/*"
        maxFiles={2}
        maxSize={4 * 1024 * 1024}
        onAccept={(files) => setFiles(files)}
        onUpload={onUpload}
        onFileReject={onFileReject}
        multiple
        disabled={isUploading}
      >
        <FileUploadDropzone>
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center justify-center rounded-full border p-2.5">
              <Upload className="size-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-sm">Drag & drop images here</p>
            <p className="text-muted-foreground text-xs">
              Or click to browse (max 2 files, up to 4MB each)
            </p>
          </div>
          <FileUploadTrigger asChild>
            <Button variant="outline" size="sm" className="mt-2 w-fit">
              Browse files
            </Button>
          </FileUploadTrigger>
        </FileUploadDropzone>
        <FileUploadList>
          {files.map((file, index) => (
            <FileUploadItem key={index} value={file}>
              <div className="flex w-full items-center gap-2">
                <FileUploadItemPreview />
                <FileUploadItemMetadata />
                <FileUploadItemDelete asChild>
                  <Button variant="ghost" size="icon" className="size-7">
                    <X />
                  </Button>
                </FileUploadItemDelete>
              </div>
              <FileUploadItemProgress />
            </FileUploadItem>
          ))}
        </FileUploadList>
      </FileUpload>
      {uploadedFiles.length > 0 ? (
        <div className="flex flex-col gap-4">
          <p className="font-medium text-sm">Uploaded files</p>
          <div className="flex items-center gap-2 overflow-x-auto">
            {uploadedFiles.map((file) => (
              <div key={file.key} className="relative size-20">
                <Image
                  src={file.ufsUrl}
                  alt={file.name}
                  fill
                  sizes="100px"
                  className="aspect-square rounded-md object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
