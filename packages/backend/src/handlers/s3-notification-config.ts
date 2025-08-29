import {
  CloudFormationCustomResourceHandler,
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceResponse,
} from 'aws-lambda';
import {
  S3Client,
  PutBucketNotificationConfigurationCommand,
  GetBucketNotificationConfigurationCommand,
  FilterRuleName,
  Event,
} from '@aws-sdk/client-s3';
import { logger } from '../shared/logger';
import { config } from '../config';

const s3NotificationHandler = (
  s3Client: S3Client
) => async (
  event: CloudFormationCustomResourceEvent
): Promise<CloudFormationCustomResourceResponse> => {
  const physicalResourceId = 
    'PhysicalResourceId' in event ? event.PhysicalResourceId : 'S3NotificationConfig';
    
  const response: CloudFormationCustomResourceResponse = {
    Status: 'SUCCESS',
    PhysicalResourceId: physicalResourceId,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: {},
  };

  try {
    const { BucketName, LambdaFunctionArn } = event.ResourceProperties;

    if (event.RequestType === 'Delete') {
      // Remove notification configuration on stack deletion
      logger.info('Removing S3 notification configuration', { BucketName });
      
      await s3Client.send(
        new PutBucketNotificationConfigurationCommand({
          Bucket: BucketName,
          NotificationConfiguration: {},
        })
      );
      
      return response;
    }

    // For Create and Update, configure the notification
    logger.info('Configuring S3 notification', {
      BucketName,
      LambdaFunctionArn,
      RequestType: event.RequestType,
    });

    // Get existing configuration to preserve any manual additions
    let existingConfig;
    try {
      const getResponse = await s3Client.send(
        new GetBucketNotificationConfigurationCommand({
          Bucket: BucketName,
        })
      );
      existingConfig = getResponse;
    } catch (error) {
      logger.warn('Could not get existing configuration, using empty', { error });
      existingConfig = {};
    }

    // Configure notification for uploads folder
    const notificationConfig = {
      ...existingConfig,
      LambdaFunctionConfigurations: [
        {
          Id: 'ProcessUploads',
          LambdaFunctionArn,
          Events: [Event.s3_ObjectCreated_],
          Filter: {
            Key: {
              FilterRules: [
                {
                  Name: FilterRuleName.prefix,
                  Value: 'uploads/',
                },
              ],
            },
          },
        },
      ],
    };

    await s3Client.send(
      new PutBucketNotificationConfigurationCommand({
        Bucket: BucketName,
        NotificationConfiguration: notificationConfig,
      })
    );

    logger.info('S3 notification configured successfully');
    return response;
  } catch (error) {
    logger.error('Error configuring S3 notification', { error });
    
    return {
      ...response,
      Status: 'FAILED',
      Reason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Direct handler export with full dependency construction
 * Custom resource handler for configuring S3 bucket notifications
 * This avoids circular dependencies in CloudFormation
 */
export const lambdaHandler: CloudFormationCustomResourceHandler = async (event, context) => {
  try {
    // Construct entire dependency graph here
    const { awsRegion } = config();
    
    const s3Client = new S3Client({ region: awsRegion });
    
    // Call the actual handler logic directly
    const handler = s3NotificationHandler(s3Client);
    const response = await handler(event);
    
    // CloudFormation custom resource requires callback
    if (context.done) {
      context.done(undefined, response);
    }
  } catch (error) {
    const errorResponse = {
      Status: 'FAILED' as const,
      PhysicalResourceId: 'S3NotificationConfig',
      StackId: event.StackId,
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
      Data: {},
      Reason: error instanceof Error ? error.message : 'Unknown error',
    };
    
    if (context.done) {
      context.done(undefined, errorResponse);
    }
  }
};