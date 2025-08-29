import {
  CloudFormationCustomResourceHandler,
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceResponse,
} from 'aws-lambda';
import {
  S3Client,
  PutBucketNotificationConfigurationCommand,
  GetBucketNotificationConfigurationCommand,
} from '@aws-sdk/client-s3';
import { logger } from '../shared/logger';

const s3Client = new S3Client({});

/**
 * Custom resource handler for configuring S3 bucket notifications
 * This avoids circular dependencies in CloudFormation
 */
export const lambdaHandler: CloudFormationCustomResourceHandler = async (
  event: CloudFormationCustomResourceEvent
): Promise<CloudFormationCustomResourceResponse> => {
  const response: CloudFormationCustomResourceResponse = {
    Status: 'SUCCESS',
    PhysicalResourceId: event.PhysicalResourceId || 'S3NotificationConfig',
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
          Events: ['s3:ObjectCreated:*'],
          Filter: {
            Key: {
              FilterRules: [
                {
                  Name: 'prefix',
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