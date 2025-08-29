# FileFlow Cost Analysis

## Monthly Cost Estimation

Based on the architecture and expected usage (10-100 images/day, 4K images ~25MB max):

### Assumptions
- **Daily Volume**: 50 images average
- **Image Size**: 10MB average (4K images)
- **Processing Time**: 2 seconds per Lambda invocation average
- **Region**: US East 1 (us-east-1)

### Cost Breakdown

#### 1. AWS Lambda
**Functions**: 6 Lambda functions (Presigned URL, Orchestrator, Validator, Resize, Exposure, S3 Notification)

- **Monthly Requests**: 
  - Presigned URL: 1,500 requests (50/day × 30)
  - Orchestrator: 1,500 requests
  - Validator: 1,500 requests
  - Resize: 1,500 requests
  - Exposure: 1,500 requests
  - **Total**: 7,500 requests/month

- **Compute Time**:
  - Light functions (256MB): 1,500 req × 2 sec × 3 functions = 9,000 GB-seconds
  - Heavy functions (3008MB): 1,500 req × 5 sec × 2 functions = 22,500 GB-seconds
  - **Total**: 31,500 GB-seconds/month

- **Cost**: 
  - Requests: First 1M free, then $0.20 per 1M = **$0.00**
  - Compute: First 400,000 GB-seconds free = **$0.00**

#### 2. AWS Step Functions (Express Workflows)
- **Executions**: 1,500/month
- **Duration**: ~10 seconds average
- **Cost**: First 1,000 transitions free, $0.025 per 1,000 = **$0.04**

#### 3. Amazon S3
- **Storage**: 
  - Original images: 50 images/day × 10MB × 30 days = 15GB
  - Processed images (2 versions): 30GB
  - **Total**: 45GB/month cumulative
  
- **Requests**:
  - PUT: 3,000 requests (uploads + processed)
  - GET: 6,000 requests (processing reads)
  
- **Cost**:
  - Storage: 45GB × $0.023/GB = **$1.04**
  - Requests: $0.005 per 1,000 PUT + $0.0004 per 1,000 GET = **$0.02**

#### 4. API Gateway
- **Requests**: 1,500/month
- **Cost**: First 1M requests at $3.50 per million = **$0.01**

#### 5. CloudWatch
- **Logs**: ~1GB/month ingestion
- **Metrics**: Custom metrics included
- **Dashboards**: 1 dashboard
- **Cost**: 
  - Logs: $0.50/GB ingestion + $0.03/GB storage = **$0.53**
  - Dashboard: First 3 dashboards free = **$0.00**

#### 6. Data Transfer
- **Outbound to Internet**: ~15GB/month (presigned URLs + processed downloads)
- **Cost**: First 1GB free, then $0.09/GB = **$1.26**

### Total Monthly Cost Estimate

| Service | Monthly Cost |
|---------|-------------|
| Lambda | $0.00 |
| Step Functions | $0.04 |
| S3 Storage | $1.04 |
| S3 Requests | $0.02 |
| API Gateway | $0.01 |
| CloudWatch | $0.53 |
| Data Transfer | $1.26 |
| **TOTAL** | **$2.90** |

## Cost Optimization Strategies

### Immediate Optimizations
1. **S3 Intelligent-Tiering**: Automatically move infrequently accessed files to cheaper storage classes
2. **Reserved Concurrency**: Prevent runaway Lambda costs with concurrency limits
3. **CloudWatch Log Retention**: Set to 7 days for dev, 30 days for prod

### Future Optimizations (When Scale Increases)
1. **Lambda Reserved Capacity**: Save up to 17% with 1-year commitment
2. **S3 Batch Operations**: Process multiple files in single Lambda invocation
3. **CloudFront CDN**: Cache processed images to reduce S3 GET requests
4. **Lifecycle Policies**: Delete old processed images after 90 days

## Scale Considerations

### At 1,000 images/day
- Lambda: Still within free tier
- S3 Storage: ~$20/month (900GB cumulative)
- Data Transfer: ~$25/month
- **Total**: ~$50/month

### At 10,000 images/day
- Lambda: ~$15/month (compute charges apply)
- Step Functions: ~$7.50/month
- S3 Storage: ~$200/month (9TB cumulative)
- API Gateway: ~$10/month
- Data Transfer: ~$250/month
- **Total**: ~$500/month

## AWS Free Tier Benefits (First 12 Months)
- Lambda: 1M requests + 400,000 GB-seconds/month
- S3: 5GB storage + 20,000 GET + 2,000 PUT
- CloudWatch: 10 custom metrics + 5GB logs
- Step Functions: 4,000 state transitions/month

## Monitoring Cost with AWS
```bash
# Set up billing alerts
aws cloudwatch put-metric-alarm \
  --alarm-name FileFlow-Billing-Alert \
  --alarm-description "Alert when estimated charges exceed $10" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 86400 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold
```

## Cost Tags for Tracking
All resources are tagged with:
- `Environment`: dev/staging/prod
- `Project`: FileFlow
- `CostCenter`: Engineering

Enable Cost Explorer to track spending by these dimensions.