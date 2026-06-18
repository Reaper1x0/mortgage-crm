const {
  TextractClient,
  DetectDocumentTextCommand,
  StartDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommand,
} = require("@aws-sdk/client-textract");
const { envConfig } = require("../../config");

const POLL_INTERVAL_MS = Number(envConfig.TEXTRACT_POLL_INTERVAL_MS || 2000);
const MAX_POLLS = Number(envConfig.TEXTRACT_MAX_POLLS || 120);

const awsClientConfig = {
  region: envConfig.AWS_REGION,
};

if (envConfig.AWS_ACCESS_KEY_ID && envConfig.AWS_SECRET_ACCESS_KEY) {
  awsClientConfig.credentials = {
    accessKeyId: envConfig.AWS_ACCESS_KEY_ID,
    secretAccessKey: envConfig.AWS_SECRET_ACCESS_KEY,
  };
}

const textractClient = new TextractClient(awsClientConfig);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractLinesFromBlocks(blocks = []) {
  return blocks
    .filter((block) => block?.BlockType === "LINE" && block?.Text)
    .map((block) => block.Text.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

async function detectTextFromBytes(buffer) {
  const response = await textractClient.send(
    new DetectDocumentTextCommand({
      Document: { Bytes: buffer },
    })
  );
  return extractLinesFromBlocks(response?.Blocks || []);
}

async function detectTextFromS3(storagePath) {
  const start = await textractClient.send(
    new StartDocumentTextDetectionCommand({
      DocumentLocation: {
        S3Object: {
          Bucket: envConfig.S3_BUCKET_NAME,
          Name: storagePath,
        },
      },
    })
  );

  const jobId = start?.JobId;
  if (!jobId) {
    throw new Error("Textract job did not return JobId");
  }

  let pollCount = 0;
  while (pollCount < MAX_POLLS) {
    pollCount += 1;
    const jobResult = await textractClient.send(
      new GetDocumentTextDetectionCommand({ JobId: jobId })
    );

    const status = jobResult?.JobStatus;
    if (status === "SUCCEEDED") {
      const allBlocks = [...(jobResult?.Blocks || [])];
      let nextToken = jobResult?.NextToken;

      while (nextToken) {
        const nextPage = await textractClient.send(
          new GetDocumentTextDetectionCommand({
            JobId: jobId,
            NextToken: nextToken,
          })
        );
        allBlocks.push(...(nextPage?.Blocks || []));
        nextToken = nextPage?.NextToken;
      }

      return extractLinesFromBlocks(allBlocks);
    }

    if (status === "FAILED") {
      throw new Error("Textract async job failed");
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error("Textract async job timed out");
}

module.exports = {
  detectTextFromBytes,
  detectTextFromS3,
};
