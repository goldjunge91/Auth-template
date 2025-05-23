"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CloudUpload, X } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import type { UploadedFile } from "@/types";
import Image from "next/image"; // Import Image component
import { processAndSaveLocalFile } from "@/lib/file-upload-helpers"; // Import der neuen Hilfsfunktion

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
    const formData = new FormData();
    data.files.forEach((file) => {
      formData.append("files", file);
    });

    toast("Uploading files...", {
      description: "Please wait while your files are being uploaded.",
    });

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.statusText}`);
      }

      const result = await response.json();
      setUploadedFiles(result.uploadedFiles);

      toast.success("Files uploaded successfully!", {
        description: (
          <pre className="mt-2 w-80 rounded-md bg-accent/30 p-4 text-accent-foreground">
            <code>
              {JSON.stringify(
                result.uploadedFiles.map((file: UploadedFile) =>
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
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      toast.error("Error uploading files", {
        description: errorMessage,
      });
      // Optional: Fehler im Formular anzeigen
      // form.setError("files", { message: errorMessage });
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
