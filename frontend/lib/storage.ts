import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function client() {
  const endpoint = process.env.NEON_STORAGE_ENDPOINT;
  const region = process.env.NEON_STORAGE_REGION;
  const accessKeyId = process.env.NEON_STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.NEON_STORAGE_SECRET_ACCESS_KEY;
  if (!endpoint || !region || !accessKeyId || !secretAccessKey || !process.env.NEON_STORAGE_BUCKET) {
    throw new Error("STORAGE_NOT_CONFIGURED");
  }
  return new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
}

export function storageConfigured() {
  return Boolean(
    process.env.NEON_STORAGE_ENDPOINT &&
      process.env.NEON_STORAGE_REGION &&
      process.env.NEON_STORAGE_ACCESS_KEY_ID &&
      process.env.NEON_STORAGE_SECRET_ACCESS_KEY &&
      process.env.NEON_STORAGE_BUCKET,
  );
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  await client().send(
    new PutObjectCommand({
      Bucket: process.env.NEON_STORAGE_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getObject(key: string) {
  const result = await client().send(
    new GetObjectCommand({
      Bucket: process.env.NEON_STORAGE_BUCKET,
      Key: key,
    }),
  );
  const bytes = await result.Body?.transformToByteArray();
  if (!bytes) return null;
  return { bytes, contentType: result.ContentType || "application/octet-stream" };
}
