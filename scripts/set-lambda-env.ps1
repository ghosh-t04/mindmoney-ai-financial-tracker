param(
  [string]$Function = "dev-mindmoney-api",
  [string]$Region = "ap-south-1",
  [string]$UserPoolId,
  [string]$UserPoolClientId
)

Write-Host "[INFO] Preparing Lambda environment JSON..."
$EnvVars = [ordered]@{
  GEMINI_API_KEY       = $env:GEMINI_API_KEY
  USER_POOL_ID         = $UserPoolId
  USER_POOL_CLIENT_ID  = $UserPoolClientId
  DB_HOST              = "localhost"
  DB_USER              = "admin"
  DB_PASSWORD          = "MindMoney2024!"
  DB_NAME              = "mindmoney"
}
$EnvObj = @{ Variables = $EnvVars }
$json = $EnvObj | ConvertTo-Json -Compress
$json | Set-Content -Path env.json -Encoding ascii
Write-Host "[INFO] Wrote env.json: $json"

Write-Host "[INFO] Updating Lambda environment..."
aws lambda update-function-configuration `
  --function-name $Function `
  --environment file://env.json `
  --region $Region | Out-Null

Write-Host "[SUCCESS] Lambda environment updated."

