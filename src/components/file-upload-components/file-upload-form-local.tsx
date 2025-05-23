"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CloudUpload, X, AlertCircle } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import type { UploadedFile } from "@/types";
import Image from "next/image";
import { processAndSaveLocalFile } from "@/lib/upload/file-upload-helpers";
import {
  uploadResponseSchema,
  FileUploadResponse
} from "@/lib/upload/schemas/file-upload-schemas";
import {
  DEFAULT_CHUNK_SIZE,
  DEFAULT_MAX_SIZE_MB,
  ALLOWED_FILE_TYPES,
  FILE_TYPE_GROUPS,
  ERROR_MESSAGES
} from "@/config/file-upload-config";

import { Button } from "@/components/ui/button";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
  FileUploadTrigger,
  FileUploadItemProgress
} from "@/components/ui/file-upload";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Use the configurable chunk size
const CHUNK_SIZE = DEFAULT_CHUNK_SIZE;

// Create a schema for file type validation
const fileTypeSchema = z.custom<File>((file) => {
  return file instanceof File && ALLOWED_FILE_TYPES.includes(file.type);
}, {
  message: "Unsupported file type. Please upload only images, videos, or PDFs."
});

// Create the form schema with improved validation
const formSchema = z.object({
  files: z
    .array(fileTypeSchema)
    .min(1, "Please select at least one file")
    .max(2, "Please select up to 2 files")
    .refine((files) => files.every((file) => file.size <= DEFAULT_MAX_SIZE_MB * 1024 * 1024), {
      message: `File size must be less than ${DEFAULT_MAX_SIZE_MB}MB`,
      path: ["files"],
    }),
});

type FormValues = z.infer<typeof formSchema>;

export function FileUploadLocal() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      files: [],
    },
  });
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([]);

  // State to track assembly progress
  const [assemblingFiles, setAssemblingFiles] = React.useState<Record<string, boolean>>({});

  const onSubmit = React.useCallback(async (data: FormValues) => {
    toast("Starting file uploads...", {
      description: "Please wait while your files are being prepared and uploaded.",
    });

    const allUploadedFileResponses: UploadedFile[] = [];

    for (const file of data.files) {
      const uploadId = crypto.randomUUID();
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      let fileUrl = "";
      let fileName = "";

      // Show more detailed information about the upload
      toast.info(`Preparing to upload ${file.name}`, {
        id: uploadId,
        description: `File will be split into ${totalChunks} parts for efficient uploading.`,
      });

      try {
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
          const start = chunkIndex * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);
          const formData = new FormData();
          formData.append("chunk", chunk);

          const headers = new Headers();
          headers.append("X-Upload-ID", uploadId);
          headers.append("X-Chunk-Index", chunkIndex.toString());
          headers.append("X-Total-Chunks", totalChunks.toString());
          headers.append("X-Original-Filename", file.name);
          headers.append("X-File-Type", file.type);
          headers.append("X-File-Size", file.size.toString());

          // Optional: Add X-Chunk-Hash if you implement server-side chunk validation
          const chunkArrayBuffer = await chunk.arrayBuffer(); // Read chunk as ArrayBuffer
          const chunkHash = await crypto.subtle.digest('SHA-256', chunkArrayBuffer);
          headers.append('X-Chunk-Hash', Buffer.from(chunkHash).toString('hex'));

          // This toast is no longer needed as we use a single toast per file
          // that gets updated with each chunk

          try {
            // Show progress for this chunk - use the same ID for all chunks of this file
            const progressPercent = Math.floor(((chunkIndex + 1) / totalChunks) * 100);
            toast.loading(
              `Uploading ${file.name}: ${progressPercent}%`,
              {
                id: uploadId, // Use the same ID for all chunks to update the same toast
                description: `Chunk ${chunkIndex + 1} of ${totalChunks}`,
                duration: 3000, // Auto-dismiss after 3 seconds if not updated
              }
            );

            const response = await fetch("/api/upload", {
              method: "POST",
              body: formData,
              headers,
            });

            let responseData;
            try {
              // Try to parse the response as JSON
              responseData = await response.json();
            } catch (jsonError) {
              console.error("Failed to parse response as JSON:", jsonError);
              // If JSON parsing fails, try to read the text
              const textResponse = await response.text();
              console.error("Raw response:", textResponse);

              // Show user-friendly error - use the same ID to replace the loading toast
              toast.error(ERROR_MESSAGES.SERVER_ERROR, {
                id: uploadId, // Use the same ID to replace the previous toast
                description: "The server returned an invalid response format."
              });

              throw new Error(`Invalid server response: ${textResponse || "Empty response"}`);
            }

            if (!response.ok) {
              // If the response is not OK, throw an error with the data
              const errorMessage = responseData?.error || `Server error: ${response.status} ${response.statusText}`;
              console.error("Server error response:", responseData);

              // Show user-friendly error based on status code
              const friendlyMessage = response.status === 413 ? ERROR_MESSAGES.FILE_TOO_LARGE(file.name, DEFAULT_MAX_SIZE_MB) :
                                     response.status === 415 ? ERROR_MESSAGES.UNSUPPORTED_FILE_TYPE(file.name, ['images', 'videos', 'PDFs']) :
                                     ERROR_MESSAGES.SERVER_ERROR;

              toast.error(friendlyMessage, {
                id: uploadId, // Use the same ID to replace the previous toast
              });

              throw new Error(errorMessage);
            }

            // Jetzt haben wir gültige JSON-Daten
            console.log(`Chunk ${chunkIndex + 1} response:`, responseData);

            // Validate the response with the schema
            if (responseData.success === true) {
              // Success case
              if (chunkIndex === totalChunks - 1) {
                // Last chunk - show assembling progress
                setAssemblingFiles(prev => ({ ...prev, [uploadId]: true }));

                toast.loading(
                  `Assembling file ${file.name}...`,
                  { id: uploadId }
                );

                // Get file URL from response
                fileUrl = responseData.fileUrl || responseData.url;
                fileName = responseData.fileName || responseData.filename;

                // Update toast when assembly is complete
                setAssemblingFiles(prev => {
                  const newState = { ...prev };
                  delete newState[uploadId];
                  return newState;
                });

                toast.success(
                  `File ${file.name} uploaded and assembled successfully!`,
                  { id: uploadId }
                );
              } else {
                // Intermediate chunk with progress indication
                const progressPercent = Math.floor(((chunkIndex + 1) / totalChunks) * 100);
                toast.success(
                  `Uploading ${file.name}: ${progressPercent}%`,
                  {
                    id: uploadId,
                    description: `Chunk ${chunkIndex + 1} of ${totalChunks} uploaded successfully.`,
                    duration: 2000, // Auto-dismiss after 2 seconds
                  }
                );
              }
            } else {
              // Error case
              const errorMessage = responseData.error || "Unknown error during upload";
              toast.error(ERROR_MESSAGES.UPLOAD_FAILED, {
                id: uploadId, // Use the same ID to replace the previous toast
                description: errorMessage
              });
              throw new Error(errorMessage);
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            console.error(`Error uploading chunk ${chunkIndex + 1}:`, error);

            // Provide more user-friendly error messages
            let friendlyMessage = ERROR_MESSAGES.UPLOAD_FAILED;
            let description = "Please try again or contact support if the problem persists.";

            if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
              friendlyMessage = ERROR_MESSAGES.NETWORK_ERROR;
              description = "Check your internet connection and try again.";
            } else if (errorMessage.includes("integrity") || errorMessage.includes("hash")) {
              friendlyMessage = ERROR_MESSAGES.HASH_MISMATCH;
            } else if (errorMessage.includes("too large")) {
              friendlyMessage = ERROR_MESSAGES.FILE_TOO_LARGE(file.name, DEFAULT_MAX_SIZE_MB);
            }

            toast.error(friendlyMessage, {
              id: uploadId,
              description: description,
            });

            // Abort the upload for this file
            throw error;
          }
        }

        if (fileUrl && fileName) {
          allUploadedFileResponses.push({
            key: uploadId, // Or use a server-generated key if available
            name: fileName,
            url: fileUrl,
            size: file.size,
            type: file.type,
            // Fülle die fehlenden Eigenschaften mit Standard- oder Nullwerten
            serverData: null,
            customId: null,
            appUrl: "", // Oder eine relevante URL, falls zutreffend
            ufsUrl: fileUrl, // Kann gleich wie url sein für lokale Server-Uploads
            fileHash: `${fileName}-${file.size}-${uploadId}`, // Einfacher Hash basierend auf verfügbaren Daten
          });
        } else {
          // This case should ideally not be reached if the last chunk response is correct
          throw new Error(`File ${file.name} was processed but no final URL was received.`);
        }

      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred during chunked upload";
        console.error(`Error in file upload process for ${file.name}:`, error);

        // Clear any assembling state for this file
        setAssemblingFiles(prev => {
          const newState = { ...prev };
          delete newState[uploadId];
          return newState;
        });

        // Show a more user-friendly error message
        toast.error(ERROR_MESSAGES.UPLOAD_FAILED, {
          id: uploadId, // Update the main toast for this file with error
          description: "The upload process was interrupted. You may try again.",
        });

        // Optional: Add a retry button or mechanism here
        // For now, we'll let it try other files if any
      }
    }

    if (allUploadedFileResponses.length > 0) {
      setUploadedFiles((prev) => [...prev, ...allUploadedFileResponses]);
      toast.success("All selected files processed.", {
        description: (
          <pre className="mt-2 w-80 rounded-md bg-accent/30 p-4 text-accent-foreground">
            <code>
              {JSON.stringify(
                allUploadedFileResponses.map((file: UploadedFile) =>
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
    } else if (data.files.length > 0) {
        toast.warning("Some files could not be uploaded. Please check individual error messages.");
    }


  }, [form]);

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="files"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Attachments</FormLabel>
                <FormControl>
                  <FileUpload
                    value={field.value}
                    onValueChange={field.onChange}
                    accept={ALLOWED_FILE_TYPES.join(',')}
                    maxFiles={2}
                    maxSize={DEFAULT_MAX_SIZE_MB * 1024 * 1024}
                    onFileReject={(file, message) => {
                      console.log(`File rejected: ${file.name} - ${message}`);
                      form.setError("files", {
                        message: file.size > DEFAULT_MAX_SIZE_MB * 1024 * 1024
                          ? ERROR_MESSAGES.FILE_TOO_LARGE(file.name, DEFAULT_MAX_SIZE_MB)
                          : ERROR_MESSAGES.UNSUPPORTED_FILE_TYPE(file.name, ['images', 'videos', 'PDFs']),
                      });
                    }}
                    multiple
                  >
                    <FileUploadDropzone className="flex-row border-dotted">
                      <CloudUpload className="size-4" />
                      Drag and drop or
                      <FileUploadTrigger asChild>
                        <Button variant="link" size="sm" className="p-0">
                          choose files
                        </Button>
                      </FileUploadTrigger>
                      to upload
                    </FileUploadDropzone>
                    <FileUploadList>
                      {field.value.map((file, index) => (
                        <FileUploadItem key={index} value={file}>
                          <FileUploadItemPreview />
                          <FileUploadItemMetadata />
                          <FileUploadItemDelete asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                            >
                              <X />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </FileUploadItemDelete>
                        </FileUploadItem>
                      ))}
                    </FileUploadList>
                  </FileUpload>
                </FormControl>
                <FormDescription>
                  Upload up to 2 files (images, videos, or PDFs) up to {DEFAULT_MAX_SIZE_MB}MB each.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="mt-4 w-full">
            Submit
          </Button>
        </form>
      </Form>
      {uploadedFiles.length > 0 && (
        <div className="mt-6 flex flex-col gap-4">
          <p className="font-medium text-sm">Uploaded files</p>
          {/* Use UploadedFilesCard or direct image display like in file-upload-uploadthing.tsx */}
          {/* Option 1: Keep UploadedFilesCard (current implementation) */}
          {/* <UploadedFilesCard uploadedFiles={uploadedFiles} /> */}

          {/* Option 2: Direct image display like in file-upload-uploadthing.tsx */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {uploadedFiles.map((file) => (
              <div key={file.key} className="relative size-20">
                <Image
                  src={file.fileUrl || file.url}
                  alt={file.name}
                  fill
                  sizes="100px"
                  className="aspect-square rounded-md object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
