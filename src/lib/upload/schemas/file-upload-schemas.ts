import * as z from "zod";

/**
 * Schema für die Antwort bei erfolgreichem Chunk-Upload (nicht der letzte Chunk)
 */
export const chunkUploadResponseSchema = z.object({
  success: z.literal(true),
  responseType: z.literal("chunkSuccess"),
  message: z.string(),
  chunkIndex: z.number().optional(),
  totalChunks: z.number().optional(),
});

/**
 * Schema für die Antwort bei erfolgreichem Upload einer vollständigen Datei
 */
export const fileUploadResponseSchema = z.object({
  success: z.literal(true),
  responseType: z.literal("fileSuccess"),
  message: z.string(),
  filename: z.string(),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  path: z.string().optional(),
  url: z.string().optional(),
  serverData: z.any().optional(),
  customId: z.string().optional().nullable(),
  appUrl: z.string().optional(),
  ufsUrl: z.string().optional(),
  fileHash: z.string().optional(),
});

/**
 * Schema für die Antwort bei einem Fehler
 */
export const errorResponseSchema = z.object({
  success: z.literal(false),
  responseType: z.literal("error"),
  error: z.string(),
  details: z.string().optional(),
  file: z.string().optional(),
  status: z.number().optional(),
});

/**
 * Kombiniertes Schema für alle möglichen Antworten
 */
export const uploadResponseSchema = z.discriminatedUnion("responseType", [
  fileUploadResponseSchema,
  errorResponseSchema,
  chunkUploadResponseSchema,
]);

/**
 * Typ für die Antwort bei erfolgreichem Chunk-Upload
 */
export type ChunkUploadResponse = z.infer<typeof chunkUploadResponseSchema>;

/**
 * Typ für die Antwort bei erfolgreichem Upload einer vollständigen Datei
 */
export type FileUploadResponse = z.infer<typeof fileUploadResponseSchema>;

/**
 * Typ für die Antwort bei einem Fehler
 */
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

/**
 * Typ für alle möglichen Antworten
 */
export type UploadResponse = z.infer<typeof uploadResponseSchema>;
