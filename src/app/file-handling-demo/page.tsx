"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Annahme: Es gibt eine Input-Komponente
import { useCallback, useState } from "react";

export default function FileHandlingDemoPage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState<number>(Date.now()); // Für das Zurücksetzen des Inputs

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) {
        setSelectedFiles(Array.from(event.target.files));
      }
    },
    []
  );

  const handleSubmit = useCallback(() => {
    if (selectedFiles.length === 0) {
      console.log("Keine Dateien zum Hochladen ausgewählt.");
      alert("Bitte wählen Sie zuerst Dateien aus.");
      return;
    }
    console.log("Ausgewählte Dateien für den Upload:", selectedFiles);
    // Hier würde die Logik für den tatsächlichen Upload implementiert werden
    // z.B. mit fetch, axios oder einer Upload-Bibliothek wie UploadThing
    alert(`${selectedFiles.length} Datei(en) würden jetzt hochgeladen.`);
  }, [selectedFiles]);

  const handleDeleteSelected = useCallback(() => {
    setSelectedFiles([]);
    // Setze den Key des Input-Elements zurück, um die Anzeige im Browser zu löschen
    setFileInputKey(Date.now());
  }, []);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-2xl font-bold mb-6">Datei-Handling Demo</h1>

      <div className="space-y-6 max-w-lg">
        <div>
          <label
            htmlFor="fileInput"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Dateien auswählen
          </label>
          <Input
            id="fileInput"
            key={fileInputKey} // Wichtig für das Zurücksetzen
            type="file"
            multiple
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Sie können mehrere Dateien auswählen.
          </p>
        </div>

        {selectedFiles.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Ausgewählte Dateien:</h2>
            <ul className="list-disc list-inside space-y-1 bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
              {selectedFiles.map((file, index) => (
                <li key={index} className="text-sm">
                  {file.name} ({Math.round(file.size / 1024)} KB)
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex space-x-4">
          <Button onClick={handleSubmit} disabled={selectedFiles.length === 0}>
            Hochladen (Submit)
          </Button>
          <Button
            onClick={handleDeleteSelected}
            variant="destructive"
            disabled={selectedFiles.length === 0}
          >
            Auswahl aufheben
          </Button>
        </div>
      </div>
    </div>
  );
}
