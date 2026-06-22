import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import crypto from "crypto";

const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export type AssetFolder =
  | "complaints"
  | "profiles"
  | "documents"
  | "receipts"
  | "notices";

/**
 * Uploads a raw buffer directly to Cloudflare R2 and returns the absolute public URL.
 */
export const uploadToR2 = async (
  fileBuffer: Buffer,
  originalName: string,
  folder: AssetFolder,
  mimeType: string,
): Promise<string> => {
  const fileExtension = originalName.split(".").pop();
  const uniqueFileName = `${folder}/${crypto.randomBytes(16).toString("hex")}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: uniqueFileName,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  await r2Client.send(command);
  return `${process.env.R2_PUBLIC_CUSTOM_DOMAIN}/${uniqueFileName}`;
};
