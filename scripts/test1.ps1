param(
    [string]$Username = "testuser",
    [string]$Password = "TestPassword123!",
    [switch]$RunProtectedTests = $false
)

$Region = "ap-south-1"
$StackName = "mindmoney-dev-gemini"

Write-Host "[INFO] Fetching CloudFormation outputs..."
$outputs = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $Region `
    --query "Stacks[0].Outputs" `
    --output json `
    --no-cli-pager | ConvertFrom-Json

$UserPoolId      = ($outputs | Where-Object { $_.OutputKey -eq "UserPoolId" }).OutputValue
$UserPoolClientId= ($outputs | Where-Object { $_.OutputKey -eq "UserPoolClientId" }).OutputValue
$ApiGatewayUrl   = ($outputs | Where-Object { $_.OutputKey -eq "ApiGatewayUrl" }).OutputValue

Write-Host "[INFO] UserPoolId: $UserPoolId"
Write-Host "[INFO] UserPoolClientId: $UserPoolClientId"
Write-Host "[INFO] API Gateway URL: $ApiGatewayUrl"

Write-Host "[INFO] Health check (no auth)..."
try {
    $health = Invoke-WebRequest -Uri ("$ApiGatewayUrl/health") -UseBasicParsing -TimeoutSec 30
    Write-Host "[SUCCESS] Health: $($health.StatusCode)"
}
catch {
    Write-Host "[WARNING] Health check failed: $($_.Exception.Message)"
}

Write-Host "[INFO] Signing up user $Username..."
try {
    aws cognito-idp sign-up `
        --region $Region `
        --client-id $UserPoolClientId `
        --username $Username `
        --password $Password `
        --user-attributes Name=email,Value=$Username Name=name,Value="Test User" `
        --no-cli-pager | Out-Null
}
catch {
    $msg = $_.Exception.Message
    if ($msg -match "UsernameExistsException") {
        Write-Host "[INFO] User already exists. Continuing..."
    } else {
        Write-Host "[WARNING] Sign-up error: $msg"
    }
}

Write-Host "[INFO] Confirming user..."
try {
    aws cognito-idp admin-confirm-sign-up `
        --region $Region `
        --user-pool-id $UserPoolId `
        --username $Username `
        --no-cli-pager | Out-Null
}
catch {
    Write-Host "[INFO] Confirm step may be unnecessary: $($_.Exception.Message)"
}

Write-Host "[INFO] Authenticating user..."
try {
    $authResponse = aws cognito-idp initiate-auth `
        --auth-flow USER_PASSWORD_AUTH `
        --client-id $UserPoolClientId `
        --auth-parameters USERNAME=$Username,PASSWORD=$Password `
        --region $Region `
        --no-cli-pager | ConvertFrom-Json
}
catch {
    Write-Host "[ERROR] Authentication failed. Ensure the app client allows USER_PASSWORD_AUTH."
    throw
}

$AccessToken = $authResponse.AuthenticationResult.AccessToken
Write-Host "[SUCCESS] Got Access Token."

Write-Host "[INFO] Calling /health with Bearer token..."
$headers = @{ Authorization = "Bearer $AccessToken" }
try {
    $response = Invoke-WebRequest -Uri ("$ApiGatewayUrl/health") -Headers $headers -UseBasicParsing -TimeoutSec 30
    Write-Host "[SUCCESS] Auth health: $($response.StatusCode)"
}
catch {
    Write-Host "[WARNING] Auth health call failed: $($_.Exception.Message)"
}

Write-Host "[RESULT] API Response:"
Write-Output $response

# Optional protected endpoint tests
if ($RunProtectedTests) {
    Write-Host "[INFO] Running protected endpoint tests..."
    try {
        # Decode JWT access token to extract user sub (userId)
        $payload = ($AccessToken -split '\.')[1].Replace('-', '+').Replace('_', '/')
        $pad = 4 - (($payload.Length) % 4); if ($pad -lt 4) { $payload += ('=' * $pad) }
        $jwtPayload = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload)) | ConvertFrom-Json
        $userId = $jwtPayload.sub
        Write-Host "[INFO] Decoded userId (sub): $userId"

        $headers = @{ Authorization = "Bearer $AccessToken" }

        # 1) GET spending entries for today
        $today = (Get-Date -Format yyyy-MM-dd)
        Write-Host "[INFO] GET spending entries for $today..."
        try {
            $respEntries = Invoke-WebRequest -Uri ("$ApiGatewayUrl/spending/entries/$userId?date=$today") -Headers $headers -UseBasicParsing -TimeoutSec 30
            Write-Host "[SUCCESS] Entries status: $($respEntries.StatusCode)"
            Write-Output $respEntries.Content
        } catch { Write-Host "[WARNING] Entries call failed: $($_.Exception.Message)" }

        # 2) POST savings goal
        Write-Host "[INFO] POST savings goal..."
        $goalBody = @{ monthlyIncome = 5000; monthlySavingsGoal = 1000 } | ConvertTo-Json
        try {
            $respGoal = Invoke-WebRequest -Uri ("$ApiGatewayUrl/savings/goal") -Headers $headers -UseBasicParsing -Method POST -ContentType application/json -Body $goalBody -TimeoutSec 30
            Write-Host "[SUCCESS] Goal status: $($respGoal.StatusCode)"
            Write-Output $respGoal.Content
        } catch { Write-Host "[WARNING] Goal call failed: $($_.Exception.Message)" }
    }
    catch {
        Write-Host "[WARNING] Protected tests aborted: $($_.Exception.Message)"
    }
}


