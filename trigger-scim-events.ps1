# SCIM Event Trigger Script for Badge Notification Testing
# This script creates real SCIM events to test tab/favicon notifications

$baseUrl = "http://localhost:3000"
$token = "S@g@r!2011"

$headers = @{
    'Authorization' = "Bearer $token"
    'Content-Type' = 'application/scim+json'
}

Write-Host "🎯 Testing SCIM Badge Notifications" -ForegroundColor Cyan
Write-Host "Make sure you have the browser tab open: http://localhost:5174" -ForegroundColor Yellow
Write-Host ""

# Function to create a test user
function New-TestUser {
    param([string]$suffix)
    
    $timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
    $userData = @{
        schemas = @("urn:ietf:params:scim:schemas:core:2.0:User")
        userName = "badge_test_$suffix$timestamp@scimtool.com"
        name = @{
            familyName = "User"
            givenName = "BadgeTest$suffix"
        }
        emails = @(@{
            primary = $true
            value = "badge_test_$suffix$timestamp@scimtool.com"
        })
        active = $true
    } | ConvertTo-Json -Depth 3

    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/scim/users" -Method POST -Headers $headers -Body $userData
        Write-Host "✅ Created user: $($response.userName)" -ForegroundColor Green
        return $response
    } catch {
        Write-Host "❌ Failed to create user: $_" -ForegroundColor Red
        return $null
    }
}

# Function to create a test group
function New-TestGroup {
    param([string]$suffix)
    
    $timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
    $groupData = @{
        schemas = @("urn:ietf:params:scim:schemas:core:2.0:Group")
        displayName = "BadgeTest_Group_$suffix$timestamp"
        members = @()
    } | ConvertTo-Json -Depth 3

    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/scim/groups" -Method POST -Headers $headers -Body $groupData
        Write-Host "✅ Created group: $($response.displayName)" -ForegroundColor Green
        return $response
    } catch {
        Write-Host "❌ Failed to create group: $_" -ForegroundColor Red
        return $null
    }
}

# Test sequence
Write-Host "🔥 Generating SCIM activity..." -ForegroundColor Yellow

# Create multiple activities to trigger notifications
$user1 = New-TestUser -suffix "A"
Start-Sleep -Seconds 1

$group1 = New-TestGroup -suffix "Alpha"
Start-Sleep -Seconds 1

$user2 = New-TestUser -suffix "B"
Start-Sleep -Seconds 1

Write-Host ""
Write-Host "🎉 Generated 3 new SCIM activities!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Check your browser tab now:" -ForegroundColor Cyan
Write-Host "   • Tab title should show: (X) SCIMTool..." -ForegroundColor White
Write-Host "   • Favicon should have red notification badge" -ForegroundColor White
Write-Host "   • Browser console should show debug logs" -ForegroundColor White
Write-Host ""
Write-Host "⏰ Wait 10 seconds for auto-refresh to detect new activities..." -ForegroundColor Yellow
Write-Host "🔄 Or manually refresh the Activity Feed tab" -ForegroundColor Yellow
Write-Host ""
Write-Host "💡 Click on the tab to focus it and clear the notification!" -ForegroundColor Magenta