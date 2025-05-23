"use client";

import * as FileUpload from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { useState } from "react";

// Definiere den Typ für den Dateistatus explizit, basierend auf der file-upload.tsx Komponente
interface CustomFileState {
  file: File;
  progress: number;
  error?: string;
  status: "idle" | "uploading" | "error" | "success";
  id: string; // id ist jetzt erforderlich für einen stabilen Key
}

export default function FileUploadPage() {
  const [filesForRoot, setFilesForRoot] = useState<File[]>([]);
  const [detailedFileStates, setDetailedFileStates] = useState<CustomFileState[]>([]);

  const handleValueChange = (newFiles: File[]) => {
    console.log("Root onValueChange - newFiles:", newFiles);
    setFilesForRoot(newFiles);

    // Synchronisiere detailedFileStates mit newFiles
    const newDetailedStates = newFiles.map(file => {
      const existingState = detailedFileStates.find(dfs => dfs.file === file);
      if (existingState) {
        return existingState;
      }
      return {
        file,
        progress: 0,
        status: "idle" as const, // Stelle sicher, dass der Typ korrekt ist
        id: Math.random().toString(36).substring(7),
      };
    });
    setDetailedFileStates(newDetailedStates);
  };

  const handleUpload = async (
    addedFiles: File[],
    options: {
      onProgress: (file: File, progress: number) => void;
      onSuccess: (file: File) => void;
      onError: (file: File, error: Error) => void;
    }
  ) => {
    console.log("Files to upload via onUpload:", addedFiles);

    setFilesForRoot(prevFiles => {
      const currentFilesSet = new Set(prevFiles);
      const filesToAdd = addedFiles.filter(af => !currentFilesSet.has(af));
      return [...prevFiles, ...filesToAdd];
    });

    addedFiles.forEach(file => {
      setDetailedFileStates(prevDetailedStates => {
        const existingStateIndex = prevDetailedStates.findIndex(dfs => dfs.file === file);
        const newOrUpdatedState: CustomFileState = {
          file,
          progress: 0,
          status: "idle",
          id: existingStateIndex !== -1 ? prevDetailedStates[existingStateIndex].id : Math.random().toString(36).substring(7),
        };

        if (existingStateIndex !== -1) {
          const updatedStates = [...prevDetailedStates];
          updatedStates[existingStateIndex] = newOrUpdatedState;
          return updatedStates;
        }
        return [...prevDetailedStates, newOrUpdatedState];
      });
    });

    for (const file of addedFiles) {
      try {
        options.onProgress(file, 0);
        setDetailedFileStates((prevStates) =>
          prevStates.map((fs) =>
            fs.file === file ? { ...fs, progress: 0, status: "uploading" } : fs
          )
        );

        for (let i = 0; i <= 100; i += 20) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          options.onProgress(file, i);
          setDetailedFileStates((prevStates) =>
            prevStates.map((fs) =>
              fs.file === file ? { ...fs, progress: i, status: "uploading" } : fs
            )
          );
        }
        options.onSuccess(file);
        setDetailedFileStates((prevStates) =>
          prevStates.map((fs) =>
            fs.file === file ? { ...fs, status: "success", progress: 100 } : fs
          )
        );
        console.log(`Successfully uploaded ${file.name}`);
      } catch (error) {
        console.error(`Error uploading ${file.name}: `, error);
        options.onError(file, error as Error);
        setDetailedFileStates((prevStates) =>
          prevStates.map((fs) =>
            fs.file === file ? { ...fs, status: "error", error: (error as Error).message } : fs
          )
        );
      }
    }
  };

  const handleRemoveFile = (fileToRemove: File) => {
    const updatedFilesForRoot = filesForRoot.filter(file => file !== fileToRemove);
    handleValueChange(updatedFilesForRoot); // Dies löst die Synchronisation in detailedFileStates aus
  };

  const handleClearAll = () => {
    handleValueChange([]);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold">File Upload Test Page</h1>
      <FileUpload.Root
        className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 dark:border-gray-700"
        onValueChange={handleValueChange}
        onUpload={handleUpload}
        value={filesForRoot}
        multiple={true}
        accept="image/*,application/pdf"
      >
        <FileUpload.Dropzone className="mb-4 flex h-32 w-full cursor-pointer items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          <p>Drag & drop files here, or click the button below.</p>
        </FileUpload.Dropzone>
        <FileUpload.Trigger asChild>
          <Button variant="outline">Select Files</Button>
        </FileUpload.Trigger>
        <FileUpload.List className="mt-4 w-full max-w-md space-y-2">
          {filesForRoot.map((file) => {
            // Finde den zugehörigen detaillierten Zustand für den Key, falls vorhanden.
            // Die Komponente selbst sollte den Fortschritt/Status über Kontext beziehen.
            const detailedState = detailedFileStates.find(dfs => dfs.file === file);
            return (
              <FileUpload.Item
                key={detailedState?.id || file.name}
                className="flex items-center justify-between rounded-md border p-2"
                value={file} // FileUpload.Item erwartet das File-Objekt
              >
                <div className="flex items-center gap-2">
                  <FileUpload.ItemPreview className="h-10 w-10 rounded-md" />
                  <FileUpload.ItemMetadata className="flex flex-col" />
                </div>
                <div className="flex items-center gap-2">
                  <FileUpload.ItemProgress
                    className="h-2 w-20 rounded-full bg-gray-200 dark:bg-gray-700"
                  />
                  <FileUpload.ItemDelete
                    className="text-red-500 hover:text-red-700"
                    onClick={() => handleRemoveFile(file)}
                  >
                    X
                  </FileUpload.ItemDelete>
                </div>
              </FileUpload.Item>
            );
          })}
        </FileUpload.List>
        <FileUpload.Clear asChild className="mt-4">
          <Button variant="destructive" size="sm" onClick={handleClearAll}>Clear All</Button>
        </FileUpload.Clear>
      </FileUpload.Root>
    </div>
  );
}
