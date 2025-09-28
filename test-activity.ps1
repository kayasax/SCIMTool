# PowerShell script to generate test activity for badge notification testing
$baseUrl = "http://localhost:3000"
$token = "S@g@r!2011"
$timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()

$headers = @{
    'Authorization' = "Bearer $token"
    'Content-Type' = 'application/scim+json'
}

Write-Host "🧪 Creating test activity for badge notifications..." -ForegroundColor Cyan

# Create test user
$userData = @{
    schemas = @("urn:ietf:params:scim:schemas:core:2.0:User")
    userName = "testuser$timestamp@example.com"
    name = @{
        familyName = "TestUser"
        givenName = "Badge"
    }
    emails = @(@{
        primary = $true
        value = "testuser$timestamp@example.com"
    })
    active = $true
} | ConvertTo-Json -Depth 3

try {
    $userResponse = Invoke-RestMethod -Uri "$baseUrl/scim/users" -Method POST -Headers $headers -Body $userData
    Write-Host "✅ Test user created: $($userResponse.userName)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create user: $_" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# Create test group
$groupData = @{
    schemas = @("urn:ietf:params:scim:schemas:core:2.0:Group")
    displayName = "TestGroup_$timestamp"
    members = @()
} | ConvertTo-Json -Depth 3

try {
    $groupResponse = Invoke-RestMethod -Uri "$baseUrl/scim/groups" -Method POST -Headers $headers -Body $groupData
    Write-Host "✅ Test group created: $($groupResponse.displayName)" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create group: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ Test activity created! Check your browser:" -ForegroundColor Green
Write-Host "1. Open http://localhost:5174" -ForegroundColor Yellow
Write-Host "2. Watch browser console for debug logs" -ForegroundColor Yellow
Write-Host "3. Wait 10 seconds for auto-refresh" -ForegroundColor Yellow
Write-Host "4. Check if tab title shows notification count" -ForegroundColor Yellow