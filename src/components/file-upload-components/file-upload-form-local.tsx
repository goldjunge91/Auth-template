"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CloudUpload, X } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import type { UploadedFile } from "@/types";
import Image from "next/image"; // Import Image component
import { processAndSaveLocalFile } from "@/lib/file-upload-helpers"; // Import der neuen Hilfsfunktion
import { 
  uploadResponseSchema, 
  FileUploadResponse 
} from "@/lib/schemas/file-upload-schemas";

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

const CHUNK_SIZE = 1 * 1024 * 1024; // 1MB

const formSchema = z.object({
  files: z
    .array(z.custom<File>())
    .min(1, "Please select at least one file")
    .max(2, "Please select up to 2 files")
    .refine((files) => files.every((file) => file.size <= 5 * 1024 * 1024), {
      message: "File size must be less than 5MB",
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

      toast.info(`Uploading ${file.name} in ${totalChunks} chunks.`, {
        id: uploadId, // Use uploadId to update this toast later
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

          toast.info(
            `Uploading chunk ${chunkIndex + 1}/${totalChunks} for ${file.name}`,
            {
              id: `${uploadId}-chunk-${chunkIndex}`,
              duration: 5000, // Auto-dismiss after 5s, or update on next chunk
            },
          );

          try {
            const response = await fetch("/api/upload", {
              method: "POST",
              body: formData,
              headers,
            });

            let responseData;
            try {
              // Versuche, die Antwort als JSON zu parsen
              responseData = await response.json();
            } catch (jsonError) {
              console.error("Failed to parse response as JSON:", jsonError);
              // Wenn JSON-Parsing fehlschlägt, versuche, den Text zu lesen
              const textResponse = await response.text();
              console.error("Raw response:", textResponse);
              throw new Error(`Invalid server response: ${textResponse || "Empty response"}`);
            }

            if (!response.ok) {
              // Wenn die Antwort nicht OK ist, wirf einen Fehler mit den Daten
              const errorMessage = responseData?.error || `Server error: ${response.status} ${response.statusText}`;
              console.error("Server error response:", responseData);
              throw new Error(errorMessage);
            }

            // Jetzt haben wir gültige JSON-Daten
            console.log(`Chunk ${chunkIndex + 1} response:`, responseData);

            // Validiere die Antwort mit dem Schema
            if (responseData.success === true) {
              // Erfolgsfall
              if (chunkIndex === totalChunks - 1) {
                // Letzter Chunk
                fileUrl = responseData.fileUrl || responseData.url;
                fileName = responseData.fileName || responseData.filename;
                toast.success(
                  `File ${file.name} uploaded and assembled successfully!`,
                  { id: uploadId }
                );
              } else {
                // Zwischenchunk
                toast.success(
                  `Chunk ${chunkIndex + 1}/${totalChunks} for ${file.name} uploaded successfully.`,
                  { id: `${uploadId}-chunk-${chunkIndex}`, duration: 2000 }
                );
              }
            } else {
              // Fehlerfall
              throw new Error(responseData.error || "Unknown error during upload");
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            console.error(`Error uploading chunk ${chunkIndex + 1}:`, error);
            toast.error(`Error uploading ${file.name}`, {
              id: uploadId,
              description: errorMessage,
            });
            // Breche den Upload für diese Datei ab
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
        toast.error(`Error uploading ${file.name}`, {
          id: uploadId, // Update the main toast for this file with error
          description: errorMessage,
        });
        // Optional: Stop further uploads or handle retry logic here
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
                    accept="image/*"
                    maxFiles={2}
                    maxSize={5 * 1024 * 1024}
                    onFileReject={(_, message) => {
                      form.setError("files", {
                        message,
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
                  Upload up to 2 images up to 5MB each.
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
                  src={file.url} 
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
