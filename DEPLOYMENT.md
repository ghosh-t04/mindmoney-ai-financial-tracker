# MindMoney Deployment Guide

This guide provides step-by-step instructions for deploying the MindMoney AI-powered finance tracker to AWS.

## Prerequisites

### Required Software
- **Node.js 18+** and npm
- **AWS CLI** configured with appropriate permissions
- **Git** for version control
- **PowerShell** (Windows) or **Bash** (Linux/Mac)

### AWS Account Setup
1. Create an AWS account if you don't have one
2. Configure AWS CLI with your credentials:
   ```bash
   aws configure
   ```
3. Ensure you have the following permissions:
   - CloudFormation (full access)
   - IAM (create roles and policies)
   - VPC (create networking resources)
   - RDS (create database)
   - Lambda (create and update functions)
   - API Gateway (create and manage APIs)
   - Cognito (create user pools)
   - ECS (create cluster and services)
   - S3 (create buckets and manage objects)
   - CloudFront (create distributions)

## Quick Start Deployment

### 1. Clone and Setup
```bash
git clone <repository-url>
cd mindmoney
npm install
```

### 2. Deploy Infrastructure

#### Windows (PowerShell):
```powershell
.\scripts\deploy.ps1 -Environment dev -Region us-east-1
```

#### Linux/Mac:
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh dev us-east-1
```

### 3. Initialize Database
After deployment, connect to your RDS instance and run:
```sql
-- Execute the contents of database/schema.sql
```

### 4. Set Up Ollama (Local Development)
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull LLaMA 2 model
ollama pull llama2

# Start Ollama server
ollama serve
```

### 5. Run Development Server
```bash
npm run dev
```

## Detailed Deployment Steps

### Step 1: Infrastructure Deployment

The deployment script creates the following AWS resources:

#### Networking
- VPC with public and private subnets
- Internet Gateway and NAT Gateway
- Security Groups for web and database access

#### Database
- RDS MySQL instance in private subnets
- Database subnet group
- Security group allowing access from web servers

#### Authentication
- Cognito User Pool for user management
- Cognito Identity Pool for AWS resource access
- IAM roles for authenticated users

#### API Backend
- Lambda function for API logic
- API Gateway for REST endpoints
- IAM roles for Lambda execution

#### AI Service
- ECS Fargate cluster for Ollama
- Application Load Balancer for Ollama access
- Security groups for container networking

#### Frontend Hosting
- S3 bucket for static assets
- CloudFront distribution for global CDN
- Bucket policies for public access

### Step 2: Database Initialization

1. **Get Database Endpoint**:
   ```bash
   aws cloudformation describe-stacks \
     --stack-name mindmoney-dev \
     --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
     --output text
   ```

2. **Connect to Database**:
   ```bash
   mysql -h <database-endpoint> -u admin -p
   ```

3. **Run Schema**:
   ```sql
   source database/schema.sql
   ```

### Step 3: Lambda Function Deployment

The deployment script automatically:
- Creates a deployment package
- Updates the Lambda function code
- Sets environment variables
- Configures API Gateway integration

### Step 4: Frontend Deployment

1. **Build the Application**:
   ```bash
   npm run build
   ```

2. **Deploy to S3**:
   ```bash
   aws s3 sync out/ s3://<bucket-name> --delete
   ```

3. **Invalidate CloudFront**:
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id <distribution-id> \
     --paths "/*"
   ```

## Environment Configuration

### Generated Environment File
The deployment script creates `.env.local` with:
```env
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_AWS_USER_POOL_ID=<user-pool-id>
NEXT_PUBLIC_AWS_USER_POOL_CLIENT_ID=<client-id>
NEXT_PUBLIC_AWS_IDENTITY_POOL_ID=<identity-pool-id>
NEXT_PUBLIC_API_GATEWAY_URL=<api-gateway-url>
NEXT_PUBLIC_OLLAMA_API_URL=<ollama-endpoint>
```

### Manual Configuration
If you need to configure manually:
1. Copy `env.example` to `.env.local`
2. Fill in the values from CloudFormation outputs
3. Restart the development server

## Production Deployment

### 1. Update Parameters
Edit `aws/infrastructure/parameters.json`:
```json
[
  {
    "ParameterKey": "Environment",
    "ParameterValue": "prod"
  },
  {
    "ParameterKey": "DatabasePassword",
    "ParameterValue": "YourSecurePassword123!",
    "NoEcho": true
  }
]
```

### 2. Deploy Production Stack
```powershell
.\scripts\deploy.ps1 -Environment prod -Region us-east-1
```

### 3. Configure Custom Domain (Optional)
1. Create SSL certificate in AWS Certificate Manager
2. Update CloudFront distribution with custom domain
3. Configure DNS records

## Monitoring and Maintenance

### CloudWatch Logs
- Lambda function logs: `/aws/lambda/mindmoney-api`
- ECS container logs: `/ecs/mindmoney-ollama`

### Database Maintenance
- Regular backups are configured (7-day retention)
- Monitor RDS performance metrics
- Scale database instance as needed

### Security Updates
- Regularly update Lambda function dependencies
- Monitor security groups and IAM policies
- Keep Ollama model updated

## Troubleshooting

### Common Issues

#### 1. Deployment Fails
- Check AWS CLI credentials
- Verify required permissions
- Review CloudFormation events

#### 2. Database Connection Issues
- Verify security group rules
- Check RDS instance status
- Confirm database credentials

#### 3. API Gateway Errors
- Check Lambda function logs
- Verify API Gateway configuration
- Test endpoints individually

#### 4. Ollama Not Responding
- Check ECS service status
- Verify load balancer health checks
- Review container logs

### Debug Commands

#### Check Stack Status
```bash
aws cloudformation describe-stacks --stack-name mindmoney-dev
```

#### View Lambda Logs
```bash
aws logs tail /aws/lambda/mindmoney-api --follow
```

#### Test API Endpoints
```bash
curl -X GET https://<api-gateway-url>/health
```

## Cost Optimization

### Development Environment
- Use `t3.micro` for RDS
- Single AZ deployment
- Minimal ECS resources

### Production Environment
- Multi-AZ for high availability
- Larger instance sizes for performance
- Reserved instances for cost savings

### Monitoring Costs
- Set up billing alerts
- Use AWS Cost Explorer
- Monitor resource utilization

## Security Considerations

### Network Security
- VPC with private subnets for database
- Security groups with minimal access
- NAT Gateway for outbound internet access

### Data Protection
- Database encryption at rest
- HTTPS for all communications
- JWT tokens for authentication

### Access Control
- IAM roles with least privilege
- Cognito for user management
- API Gateway authentication

## Scaling Considerations

### Horizontal Scaling
- Lambda functions scale automatically
- ECS service can be scaled up
- RDS read replicas for read scaling

### Performance Optimization
- CloudFront for global distribution
- Database connection pooling
- API response caching

## Backup and Recovery

### Database Backups
- Automated daily backups (7-day retention)
- Point-in-time recovery capability
- Cross-region backup replication

### Application Backups
- Source code in Git repository
- Infrastructure as Code with CloudFormation
- Environment configuration in version control

## Support and Maintenance

### Regular Tasks
- Monitor application performance
- Update dependencies
- Review security configurations
- Backup verification

### Emergency Procedures
- Database recovery procedures
- Application rollback process
- Incident response plan

---

For additional support, refer to the main README.md or create an issue in the repository.
