interface Config {
  bucketName: string;
  stateMachineArn: string;
  awsRegion: string;
}

export const config = (): Config => {
  const bucketName = process.env.BUCKET_NAME;
  if (!bucketName) {
    throw new Error('BUCKET_NAME environment variable is required');
  }

  const stateMachineArn = process.env.STATE_MACHINE_ARN;
  if (!stateMachineArn) {
    throw new Error('STATE_MACHINE_ARN environment variable is required');
  }

  const awsRegion = process.env.AWS_REGION || 'us-east-1';

  return {
    bucketName,
    stateMachineArn,
    awsRegion,
  };
};