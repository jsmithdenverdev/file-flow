import { S3Handler, S3EventRecord } from 'aws-lambda';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { createHash } from 'crypto';
import { logger } from '../shared/logger';
import { config } from '../config';
import { ProcessingInput } from '../types';

const stepFunctionsService = (
  client: SFNClient,
  stateMachineArn: string
) => ({
  startExecution: async (input: ProcessingInput): Promise<string> => {
    // Generate idempotent execution name
    const executionName = createHash('md5')
      .update(`${input.bucket}-${input.key}-${Date.now()}`)
      .digest('hex');

    const command = new StartExecutionCommand({
      stateMachineArn,
      name: `img-process-${executionName}`,
      input: JSON.stringify(input),
    });

    const response = await client.send(command);
    return response.executionArn || '';
  },
});

const processS3Record = async (
  record: S3EventRecord,
  service: ReturnType<typeof stepFunctionsService>
): Promise<void> => {
  const { bucket, object } = record.s3;

  // Decode the S3 key (handles special characters and spaces)
  const decodedKey = decodeURIComponent(object.key.replace(/\+/g, ' '));

  // Skip if not in uploads folder
  if (!decodedKey.startsWith('uploads/')) {
    logger.info(`Skipping non-upload object: ${decodedKey}`);
    return;
  }

  // Skip if it's a folder (ends with /)
  if (decodedKey.endsWith('/')) {
    logger.info(`Skipping folder: ${decodedKey}`);
    return;
  }

  const input: ProcessingInput = {
    bucket: bucket.name,
    key: decodedKey,
    contentType: 'image/jpeg', // Default content type, will be determined from file
    size: object.size,
    uploadedAt: record.eventTime,
  };

  logger.info('Starting processing for file', input);
  
  try {
    const executionArn = await service.startExecution(input);
    logger.info('Started Step Functions execution', { executionArn, key: decodedKey });
  } catch (error) {
    // Check if execution already exists (idempotency)
    if (error instanceof Error && error.name === 'ExecutionAlreadyExists') {
      logger.info('Execution already exists for file', { key: decodedKey });
      return;
    }
    throw error;
  }
};

const orchestratorHandler = (
  stateMachineArn: string,
  sfnClient: SFNClient
) => async (event: import('aws-lambda').S3Event) => {
  const service = stepFunctionsService(sfnClient, stateMachineArn);

  logger.info('Processing S3 event', { 
    recordCount: event.Records.length 
  });

  const promises = event.Records.map((record) =>
    processS3Record(record, service).catch((error) => {
      logger.error(
        `Failed to process record ${record.s3.object.key}`,
        error
      );
      // Don't throw to allow other records to process
      // but log the error for monitoring
      return Promise.resolve();
    })
  );

  await Promise.all(promises);

  logger.info('Completed processing all S3 records');
};

// Direct handler export with full dependency construction
export const lambdaHandler: S3Handler = async (event) => {
  // Construct entire dependency graph here
  const { stateMachineArn, awsRegion } = config();
  
  const sfnClient = new SFNClient({ region: awsRegion });
  
  // Call the actual handler logic directly
  const handler = orchestratorHandler(stateMachineArn, sfnClient);
  return handler(event);
};