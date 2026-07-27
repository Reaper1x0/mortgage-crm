#!/usr/bin/env node
/**
 * Wipes MongoDB and empties the configured S3 bucket.
 *
 * Usage:
 *   node scripts/reset-fresh.js --confirm
 *
 * Production requires:
 *   RESET_CONFIRM=YES node scripts/reset-fresh.js --confirm
 */
const path = require("path");
const mongoose = require("mongoose");
const {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} = require("@aws-sdk/client-s3");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { mongoConfig } = require("../src/config");

function getArg(name) {
  return process.argv.includes(`--${name}`);
}

function getAwsClientConfig(region) {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (accessKeyId && secretAccessKey) {
    return { region, credentials: { accessKeyId, secretAccessKey } };
  }
  return { region };
}

async function emptyS3Bucket(bucket, region) {
  const client = new S3Client(getAwsClientConfig(region));
  let continuationToken;
  let deleted = 0;

  do {
    const listResponse = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
      })
    );

    const objects = (listResponse.Contents || [])
      .filter((item) => item.Key)
      .map((item) => ({ Key: item.Key }));

    if (objects.length > 0) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: objects, Quiet: true },
        })
      );
      deleted += objects.length;
      console.log(`  deleted ${deleted} S3 object(s)...`);
    }

    continuationToken = listResponse.IsTruncated ? listResponse.NextContinuationToken : undefined;
  } while (continuationToken);

  return deleted;
}

async function dropMongoDatabase() {
  await mongoose.connect(mongoConfig.url, mongoConfig.options);
  const dbName = mongoose.connection.db.databaseName;
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close(false);
  return dbName;
}

async function main() {
  const confirmed = getArg("confirm");
  const nodeEnv = process.env.NODE_ENV || "development";
  const bucket = process.env.S3_BUCKET_NAME;
  const region = process.env.AWS_REGION;

  if (!confirmed) {
    console.error("\nRefusing to run without --confirm\n");
    console.error("  node scripts/reset-fresh.js --confirm\n");
    process.exit(1);
  }

  if (nodeEnv === "production" && process.env.RESET_CONFIRM !== "YES") {
    console.error("\nProduction reset blocked. Set RESET_CONFIRM=YES to continue.\n");
    process.exit(1);
  }

  if (!mongoConfig.url) {
    console.error("MONGO_URI is missing.");
    process.exit(1);
  }
  if (!bucket || !region) {
    console.error("S3_BUCKET_NAME and AWS_REGION are required.");
    process.exit(1);
  }

  console.log("\n=== Mortgage CRM — fresh reset ===\n");
  console.log(`Environment : ${nodeEnv}`);
  console.log(`MongoDB     : ${mongoConfig.url}`);
  console.log(`S3 bucket   : ${bucket} (${region})`);
  console.log("\nThis will DELETE all database records and ALL files in the bucket.\n");

  const dbName = await dropMongoDatabase();
  console.log(`✓ Dropped MongoDB database: ${dbName}`);

  const deletedCount = await emptyS3Bucket(bucket, region);
  console.log(`✓ Emptied S3 bucket (${deletedCount} object(s) removed)`);

  console.log("\nDone. Next steps:");
  console.log("  1. Start the API: npm run dev");
  console.log("  2. Super admin is created automatically on startup (see docs/user-manual.html)");
  console.log("  3. Register a user, complete onboarding, then seed master fields in the workspace\n");
}

main().catch((err) => {
  console.error("\nReset failed:", err?.message || err);
  mongoose.connection.close(false).finally(() => process.exit(1));
});
