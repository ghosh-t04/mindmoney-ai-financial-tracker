#!/bin/bash

# MindMoney Deployment Script
# This script deploys the complete MindMoney infrastructure to AWS

set -e

# Configuration
ENVIRONMENT=${1:-dev}
REGION=${2:-us-east-1}
STACK_NAME="mindmoney-${ENVIRONMENT}"
TEMPLATE_FILE="aws/infrastructure/cloudformation-template.yaml"
PARAMETERS_FILE="aws/infrastructure/parameters.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if AWS credentials are configured
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials are not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed. Please install it first."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Deploy CloudFormation stack
deploy_infrastructure() {
    log_info "Deploying CloudFormation stack: ${STACK_NAME}"
    
    # Check if stack exists
    if aws cloudformation describe-stacks --stack-name "${STACK_NAME}" --region "${REGION}" &> /dev/null; then
        log_info "Stack exists, updating..."
        aws cloudformation update-stack \
            --stack-name "${STACK_NAME}" \
            --template-body file://"${TEMPLATE_FILE}" \
            --parameters file://"${PARAMETERS_FILE}" \
            --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
            --region "${REGION}"
        
        log_info "Waiting for stack update to complete..."
        aws cloudformation wait stack-update-complete \
            --stack-name "${STACK_NAME}" \
            --region "${REGION}"
    else
        log_info "Stack does not exist, creating..."
        aws cloudformation create-stack \
            --stack-name "${STACK_NAME}" \
            --template-body file://"${TEMPLATE_FILE}" \
            --parameters file://"${PARAMETERS_FILE}" \
            --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
            --region "${REGION}"
        
        log_info "Waiting for stack creation to complete..."
        aws cloudformation wait stack-create-complete \
            --stack-name "${STACK_NAME}" \
            --region "${REGION}"
    fi
    
    log_success "Infrastructure deployment completed"
}

# Get stack outputs
get_outputs() {
    log_info "Retrieving stack outputs..."
    
    OUTPUTS=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_NAME}" \
        --region "${REGION}" \
        --query 'Stacks[0].Outputs' \
        --output json)
    
    # Extract key outputs
    USER_POOL_ID=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="UserPoolId") | .OutputValue')
    USER_POOL_CLIENT_ID=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="UserPoolClientId") | .OutputValue')
    IDENTITY_POOL_ID=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="IdentityPoolId") | .OutputValue')
    API_GATEWAY_URL=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="ApiGatewayUrl") | .OutputValue')
    DB_ENDPOINT=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="DatabaseEndpoint") | .OutputValue')
    OLLAMA_ENDPOINT=$(echo "$OUTPUTS" | jq -r '.[] | select(.OutputKey=="OllamaServiceEndpoint") | .OutputValue')
    
    log_success "Stack outputs retrieved"
}

# Deploy Lambda function
deploy_lambda() {
    log_info "Deploying Lambda function..."
    
    # Create deployment package
    cd aws/lambda
    npm install --production
    zip -r api-handler.zip . -x "*.git*" "*.md" "test/*"
    
    # Get Lambda function name from stack
    LAMBDA_FUNCTION_NAME=$(aws cloudformation describe-stack-resources \
        --stack-name "${STACK_NAME}" \
        --region "${REGION}" \
        --query 'StackResources[?ResourceType==`AWS::Lambda::Function`].PhysicalResourceId' \
        --output text)
    
    if [ -z "$LAMBDA_FUNCTION_NAME" ]; then
        log_error "Lambda function not found in stack"
        exit 1
    fi
    
    # Update function code
    aws lambda update-function-code \
        --function-name "${LAMBDA_FUNCTION_NAME}" \
        --zip-file fileb://api-handler.zip \
        --region "${REGION}"
    
    # Update environment variables
    aws lambda update-function-configuration \
        --function-name "${LAMBDA_FUNCTION_NAME}" \
        --environment Variables="{
            DB_HOST=${DB_ENDPOINT},
            DB_USER=admin,
            DB_PASSWORD=MindMoney2024!,
            DB_NAME=mindmoney,
            USER_POOL_ID=${USER_POOL_ID},
            USER_POOL_CLIENT_ID=${USER_POOL_CLIENT_ID},
            OLLAMA_API_URL=${OLLAMA_ENDPOINT}
        }" \
        --region "${REGION}"
    
    cd ../..
    log_success "Lambda function deployed"
}

# Initialize database
init_database() {
    log_info "Initializing database..."
    
    # Note: In a real deployment, you would use a more secure method to initialize the database
    # This is a simplified version for demonstration
    
    log_warning "Database initialization requires manual setup"
    log_info "Please run the following SQL script on your RDS instance:"
    log_info "File: database/schema.sql"
    log_info "Database endpoint: ${DB_ENDPOINT}"
    
    # You could also use AWS RDS Data API or a Lambda function to initialize the database
    # For now, we'll just provide instructions
}

# Deploy frontend
deploy_frontend() {
    log_info "Building and deploying frontend..."
    
    # Build the Next.js application
    npm install
    npm run build
    
    # Get S3 bucket name
    S3_BUCKET=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_NAME}" \
        --region "${REGION}" \
        --query 'Stacks[0].Outputs[?OutputKey==`StaticAssetsBucketName`].OutputValue' \
        --output text)
    
    # Upload to S3
    aws s3 sync out/ s3://"${S3_BUCKET}" --delete
    
    # Get CloudFront distribution ID
    CLOUDFRONT_ID=$(aws cloudformation describe-stacks \
        --stack-name "${STACK_NAME}" \
        --region "${REGION}" \
        --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
        --output text)
    
    # Invalidate CloudFront cache
    aws cloudfront create-invalidation \
        --distribution-id "${CLOUDFRONT_ID}" \
        --paths "/*"
    
    log_success "Frontend deployed"
}

# Create environment file
create_env_file() {
    log_info "Creating environment configuration file..."
    
    cat > .env.local << EOF
# AWS Configuration
NEXT_PUBLIC_AWS_REGION=${REGION}
NEXT_PUBLIC_AWS_USER_POOL_ID=${USER_POOL_ID}
NEXT_PUBLIC_AWS_USER_POOL_CLIENT_ID=${USER_POOL_CLIENT_ID}
NEXT_PUBLIC_AWS_IDENTITY_POOL_ID=${IDENTITY_POOL_ID}

# API Configuration
NEXT_PUBLIC_API_GATEWAY_URL=${API_GATEWAY_URL}
NEXT_PUBLIC_OLLAMA_API_URL=${OLLAMA_ENDPOINT}

# Environment
NODE_ENV=production
EOF
    
    log_success "Environment file created: .env.local"
}

# Main deployment function
main() {
    log_info "Starting MindMoney deployment for environment: ${ENVIRONMENT}"
    log_info "Region: ${REGION}"
    
    check_prerequisites
    deploy_infrastructure
    get_outputs
    deploy_lambda
    init_database
    deploy_frontend
    create_env_file
    
    log_success "Deployment completed successfully!"
    log_info "Frontend URL: https://${CLOUDFRONT_ID}.cloudfront.net"
    log_info "API Gateway URL: ${API_GATEWAY_URL}"
    log_info "Ollama Endpoint: ${OLLAMA_ENDPOINT}"
    
    log_warning "Don't forget to:"
    log_warning "1. Initialize the database with the schema.sql file"
    log_warning "2. Set up your domain name (if using custom domain)"
    log_warning "3. Configure SSL certificates for production"
    log_warning "4. Set up monitoring and logging"
}

# Run main function
main "$@"
