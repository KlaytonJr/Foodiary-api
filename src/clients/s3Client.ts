import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
  region: "us-east-1",
});

// s3Client.send(
//   new PutObjectCommand({
//     Bucket: "foodiary-api-lab",
//   })
// );
