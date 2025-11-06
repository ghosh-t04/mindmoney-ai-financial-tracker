# MindMoney Deployment Script for Windows PowerShell
# This script deploys the complete MindMoney infrastructure to AWS

param(
    [string]$Environment = "dev",
    [string]$Region = "ap-south-1"
)

$ErrorActionPreference = "Stop"

# Configuration
$StackName = "mindmoney-$Environment-gemini"
$TemplateFile = "aws/infrastructure/cloudformation-template-minimal.yaml"
$ParametersFile = "aws/infrastructure/parameters.json"

# Helper functions
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check prerequisites
function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    # Check if AWS CLI is installed
    try {
        aws --version | Out-Null
    }
    catch {
        Write-Error "AWS CLI is not installed. Please install it first."
        exit 1
    }
    
    # Check if AWS credentials are configured
    try {
        aws sts get-caller-identity | Out-Null
    }
    catch {
        Write-Error "AWS credentials are not configured. Please run 'aws configure' first."
        exit 1
    }
    
    Write-Success "Prerequisites check passed"
}

# Deploy CloudFormation stack
function Invoke-InfrastructureDeployment {
    Write-Info "Deploying CloudFormation stack: $StackName"
    
    # Check if stack exists
    $stackExists = $false
    try {
        aws cloudformation describe-stacks --stack-name $StackName --region $Region 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $stackExists = $true
        }
    }
    catch {
        $stackExists = $false
    }
    
    if ($stackExists) {
        Write-Info "Stack exists, updating..."
        aws cloudformation update-stack `
            --stack-name $StackName `
            --template-body file://$TemplateFile `
            --parameters file://$ParametersFile `
            --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM `
            --region $Region
        
        if ($LASTEXITCODE -eq 0) {
            Write-Info "Waiting for stack update to complete..."
            aws cloudformation wait stack-update-complete --stack-name $StackName --region $Region
        } else {
            Write-Warning "Stack update failed or no changes needed"
        }
    } else {
        Write-Info "Stack does not exist, creating..."
        aws cloudformation create-stack `
            --stack-name $StackName `
            --template-body file://$TemplateFile `
            --parameters file://$ParametersFile `
            --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM `
            --region $Region
        
        if ($LASTEXITCODE -eq 0) {
            Write-Info "Waiting for stack creation to complete..."
            aws cloudformation wait stack-create-complete --stack-name $StackName --region $Region
        } else {
            Write-Error "Stack creation failed"
            exit 1
        }
    }
    
    Write-Success "Infrastructure deployment completed"
}

# Get stack outputs
function Get-StackOutputs {
    Write-Info "Retrieving stack outputs..."
    
    try {
        $Outputs = aws cloudformation describe-stacks `
            --stack-name $StackName `
            --region $Region `
            --query 'Stacks[0].Outputs' `
            --output json | ConvertFrom-Json
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to retrieve stack outputs"
            exit 1
        }
        
        # Extract key outputs
        $script:UserPoolId = ($Outputs | Where-Object { $_.OutputKey -eq "UserPoolId" }).OutputValue
        $script:UserPoolClientId = ($Outputs | Where-Object { $_.OutputKey -eq "UserPoolClientId" }).OutputValue
        $script:IdentityPoolId = ($Outputs | Where-Object { $_.OutputKey -eq "IdentityPoolId" }).OutputValue
        $script:ApiGatewayUrl = ($Outputs | Where-Object { $_.OutputKey -eq "ApiGatewayUrl" }).OutputValue
        $script:DbEndpoint = "localhost"  # Placeholder for now
        $script:OllamaEndpoint = ($Outputs | Where-Object { $_.OutputKey -eq "OllamaServiceEndpoint" }).OutputValue
        
        Write-Success "Stack outputs retrieved"
    }
    catch {
        Write-Error "Failed to retrieve stack outputs: $_"
        exit 1
    }
}

# Deploy Lambda function
function Invoke-LambdaDeployment {
    Write-Info "Deploying Lambda function..."
    
    # Create deployment package
    Push-Location aws/lambda
    npm install --production
    Compress-Archive -Path * -DestinationPath api-handler.zip -Force
    
    # Get Lambda function name from stack
    try {
        $LambdaFunctionName = aws cloudformation describe-stack-resources `
            --stack-name $StackName `
            --region $Region `
            --query 'StackResources[?ResourceType==`AWS::Lambda::Function`].PhysicalResourceId' `
            --output text
        
        if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrEmpty($LambdaFunctionName)) {
            Write-Error "Lambda function not found in stack"
            exit 1
        }
    }
    catch {
        Write-Error "Failed to retrieve Lambda function name: $_"
        exit 1
    }
    
    # Update function code
    aws lambda update-function-code `
        --function-name $LambdaFunctionName `
        --zip-file fileb://api-handler.zip `
        --region $Region
    
    # Update environment variables
    # Build environment variables hashtable
    $EnvVars = @{
        DB_HOST             = $script:DbEndpoint
        DB_USER             = "admin"
        DB_PASSWORD         = "MindMoney2024!"
        DB_NAME             = "mindmoney"
        USER_POOL_ID        = $script:UserPoolId
        USER_POOL_CLIENT_ID = $script:UserPoolClientId
        GEMINI_API_KEY      = "$env:GEMINI_API_KEY"
    }

    # Wrap it under "Variables" as AWS CLI expects
    $EnvJson = @{ Variables = $EnvVars } | ConvertTo-Json -Compress

    # Update Lambda config
    aws lambda update-function-configuration `
        --function-name $LambdaFunctionName `
        --environment "$EnvJson" `
        --region $Region

    
    Pop-Location
    Write-Success "Lambda function deployed"
}

# Create environment file
function New-EnvironmentFile {
    Write-Info "Creating environment configuration file..."
    
    $EnvContent = @"
# AWS Configuration
NEXT_PUBLIC_AWS_REGION=$Region
NEXT_PUBLIC_AWS_USER_POOL_ID=$script:UserPoolId
NEXT_PUBLIC_AWS_USER_POOL_CLIENT_ID=$script:UserPoolClientId
NEXT_PUBLIC_AWS_IDENTITY_POOL_ID=$script:IdentityPoolId

# API Configuration
NEXT_PUBLIC_API_GATEWAY_URL=$script:ApiGatewayUrl

# Environment
NODE_ENV=production
"@
    
    $EnvContent | Out-File -FilePath ".env.local" -Encoding UTF8
    Write-Success "Environment file created: .env.local"
}

# Main deployment function
function Start-Deployment {
    Write-Info "Starting MindMoney deployment for environment: $Environment"
    Write-Info "Region: $Region"
    
    Test-Prerequisites
    Invoke-InfrastructureDeployment
    Get-StackOutputs
    Invoke-LambdaDeployment
    New-EnvironmentFile
    
    Write-Success "Deployment completed successfully!"
    Write-Info "API Gateway URL: $script:ApiGatewayUrl"
    Write-Info "Ollama Endpoint: $script:OllamaEndpoint"
    
    Write-Warning "Don't forget to:"
    Write-Warning "1. Initialize the database with the schema.sql file"
    Write-Warning "2. Set up your domain name (if using custom domain)"
    Write-Warning "3. Configure SSL certificates for production"
    Write-Warning "4. Set up monitoring and logging"
}

# Run main function
Start-Deployment
