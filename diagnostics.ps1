Write-Host "=== MAPPIN + N8N DIAGNOSTIC SCRIPT ===" -ForegroundColor Cyan
Write-Host ""

# Configuration
$mappinUrl = "http://s4c0c084goks00ccsk880s44.77.42.91.174.sslip.io"
$n8nUrl = "http://n8n-ncssgw0cw8sc40wc0s80ccc8.77.42.91.174.sslip.io"
$n8nWebhook = "$n8nUrl/webhook/ingest-ai"

# Test 1: Check if N8N is reachable
Write-Host "[TEST 1] Checking if N8N server is up..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $n8nUrl -Method GET -UseBasicParsing -TimeoutSec 10
    Write-Host "✓ N8N server is UP (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "✗ N8N server is DOWN or unreachable" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Check if N8N webhook endpoint exists
Write-Host "[TEST 2] Testing N8N webhook endpoint..." -ForegroundColor Yellow
try {
    $testData = @{
        test = "diagnostic"
        items = @()
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri $n8nWebhook -Method POST -Body $testData -ContentType "application/json" -UseBasicParsing -TimeoutSec 10
    Write-Host "✓ N8N webhook responded (Status: $($response.StatusCode))" -ForegroundColor Green
    Write-Host "  Response: $($response.Content)" -ForegroundColor Gray
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "✗ N8N webhook failed (Status: $statusCode)" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($statusCode -eq 404) {
        Write-Host "  → Webhook path does not exist or workflow is not active!" -ForegroundColor Magenta
    }
}
Write-Host ""

# Test 3: Check if Mappin app is up
Write-Host "[TEST 3] Checking if Mappin server is up..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $mappinUrl -Method GET -UseBasicParsing -TimeoutSec 10
    Write-Host "✓ Mappin server is UP (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "✗ Mappin server is DOWN or unreachable" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Test Mappin ingestion endpoint
Write-Host "[TEST 4] Testing Mappin /api/ingest endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$mappinUrl/api/ingest" -Method GET -UseBasicParsing -TimeoutSec 30
    Write-Host "✓ Mappin ingestion succeeded (Status: $($response.StatusCode))" -ForegroundColor Green
    Write-Host "  Response: $($response.Content)" -ForegroundColor Gray
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "✗ Mappin ingestion failed (Status: $statusCode)" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 5: Check current environment config
Write-Host "[TEST 5] Checking local environment..." -ForegroundColor Yellow
$envFile = "d:\Antigravity Projects\Mappin\mappin-app\.env.local"
if (Test-Path $envFile) {
    Write-Host "✓ Found .env.local file" -ForegroundColor Green
    $n8nConfig = Select-String -Path $envFile -Pattern "N8N_WEBHOOK_URL" -SimpleMatch
    if ($n8nConfig) {
        Write-Host "  N8N_WEBHOOK_URL = $($n8nConfig.Line)" -ForegroundColor Gray
    } else {
        Write-Host "  ⚠ N8N_WEBHOOK_URL not found in .env.local" -ForegroundColor Yellow
    }
} else {
    Write-Host "✗ .env.local file not found" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== DIAGNOSTIC COMPLETE ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "SUMMARY:" -ForegroundColor White
Write-Host "- If Test 1 fails: N8N container is down in Coolify" -ForegroundColor Gray
Write-Host "- If Test 2 fails with 404: Workflow is not active or webhook path is wrong" -ForegroundColor Gray
Write-Host "- If Test 2 fails with 500: Error in n8n workflow (check Executions tab)" -ForegroundColor Gray
Write-Host "- If Test 4 fails: Mappin cannot reach n8n (check N8N_WEBHOOK_URL env var in Coolify)" -ForegroundColor Gray
