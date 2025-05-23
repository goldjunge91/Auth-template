import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { stat, mkdir } from 'fs/promises';
import crypto from 'crypto';

// Hilfsfunktion, um sicherzustellen, dass das Upload-Verzeichnis existiert
async function ensureUploadDirExists() {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  try {
    await stat(uploadDir);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await mkdir(uploadDir, { recursive: true });
    } else {
      throw error;
    }
  }
  return uploadDir;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded.' }, { status: 400 });
    }

    const uploadDir = await ensureUploadDirExists();
    const uploadedFileResults = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Eindeutigen Dateinamen generieren, um Überschreibungen zu vermeiden
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      const filename = `${uniqueSuffix}-${file.name.replace(/\s+/g, '_')}`;
      const filePath = path.join(uploadDir, filename);

      await writeFile(filePath, buffer);

      const fileUrl = `/uploads/${filename}`; // URL relativ zum public-Ordner

      // Einfachen Hash generieren (kann durch robustere Methode ersetzt werden)
      const fileHash = crypto.createHash('md5').update(buffer).digest('hex');

      uploadedFileResults.push({
        key: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        url: fileUrl, // Dies ist jetzt die Server-URL
        type: file.type,
        serverData: { filePathOnServer: filePath }, // Zusätzliche Server-Infos
        customId: null,
        appUrl: '',
        contentDisposition: 'inline',
        ufsUrl: fileUrl, // Verwenden der Server-URL
        fileHash: fileHash,
      });
    }

    return NextResponse.json({
      message: 'Files uploaded successfully.',
      uploadedFiles: uploadedFileResults,
    }, { status: 200 });

  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during upload.';
    return NextResponse.json({ error: 'Error uploading files.', details: errorMessage }, { status: 500 });
  }
}
