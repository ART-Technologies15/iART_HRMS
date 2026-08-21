import dotenv from "dotenv";
dotenv.config({ quiet: true });

import { S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand, } from "@aws-sdk/client-s3";


const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function uploadToS3(buffer, fileName, mimeType) {
  // const safeFileName = fileName.replace(/\s+/g, "_"); // replace spaces000
  let safeFileName = decodeURIComponent(fileName)
    .replace(/\s+/g, "_")     // replace spaces
    .replace(/%20/g, "_")    // replace encoded spaces

    .replace(/[^a-zA-Z0-9._-]/g, "_")   // Replace ANY unsafe char with _
    .replace(/\s+/g, "_")              // Spaces → _
    .replace(/_+/g, "_")               // Collapse multiple _ → single _
    .replace(/^_+|_+$/g, "")           // Trim leading/trailing _
  // .replace(/\.(?=[^.]+$)/, "_");     // Ensure only one dot before extension

  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: `iART/${Date.now()}_${safeFileName}`,
    Body: buffer,
    ContentType: mimeType,
  };

  try {
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    const url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
    return { Location: url, Key: params.Key, mimeType };
  } catch (error) {
    throw error;
  }
}


export async function deleteS3File(fileUrl) {
  if (!fileUrl) return;
  const file = fileUrl.fileUrl || fileUrl;
  try {
    // Extract key safely
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    const region = process.env.AWS_REGION;

    const regex = new RegExp(`https://${bucket}\\.s3\\.${region}\\.amazonaws\\.com/(.*)`);
    const match = file.match(regex);
    const key = match ? match[1] : null;

    if (!key) throw new Error("Invalid S3 URL format");

    const params = { Bucket: bucket, Key: key };

    try {
      await s3Client.send(new HeadObjectCommand(params)); // Check existence
    } catch (err) {
      if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
        console.warn(`⚠️ File not found in S3: ${key}`);
        return; // Skip delete if missing
      } else {
        throw err;
      }
    }

    await s3Client.send(new DeleteObjectCommand(params));
    console.log(`✅ Deleted from S3: ${key}`);
  } catch (error) {
    console.error(`❌ Error deleting ${fileUrl} from S3:`, error.message);
    throw new Error(`Failed to delete from S3: ${error.message}`);
  }
};
