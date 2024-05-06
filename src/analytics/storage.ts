import { S3 } from "@aws-sdk/client-s3";
import * as fs from "node:fs";

import { config as dotenvConfig } from "dotenv";

dotenvConfig();

if (!process.env.S3_ACCESS_KEY) {
  throw new Error("S3_ACCESS_KEY is not set");
}

if (!process.env.S3_ACCESS_SECRET) {
  throw new Error("S3_ACCESS_SECRET is not set");
}

if (!process.env.S3_ENDPOINT) {
  throw new Error("S3_ENDPOINT is not set");
}

if (!process.env.S3_BUCKET_NAME) {
  throw new Error("S3_BUCKET_NAME is not set");
}

const client = new S3({
  endpoint: process.env.S3_ENDPOINT,
  region: "auto",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_ACCESS_SECRET,
  },
});

export async function downloadFileFromStorage(
  key: string,
  downloadPath: string,
): Promise<void> {
  const result = await client.getObject({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
  });
  const data = await result.Body.transformToString();
  return fs.promises.writeFile(downloadPath, data);
}

export async function uploadFileToStorage(
  key: string,
  filePath: string,
): Promise<void> {
  const data = await fs.promises.readFile(filePath);
  await client.putObject({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: data,
  });
}
