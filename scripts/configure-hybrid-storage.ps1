# Update SCIMTool Container App to use hybrid storage approach
# This script updates the DATABASE_URL to point to local ephemeral storage
# while keeping Azure Files mounted for backup purposes

param(
    [string]$ResourceGroup = "RG-FR-SCIMTOOL",
    [string]$ContainerAppName = "scimtool-ms"
)

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  SCIMTool - Hybrid Storage Configuration                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "→ Updating DATABASE_URL to use local ephemeral storage..." -ForegroundColor Yellow

# Update the DATABASE_URL environment variable
az containerapp update `
    --name $ContainerAppName `
    --resource-group $ResourceGroup `
    --set-env-vars "DATABASE_URL=file:/app/local-data/scim.db" `
    --output none

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Container app updated successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "Storage Configuration:" -ForegroundColor Cyan
    Write-Host "  • Primary DB: /app/local-data/scim.db (ephemeral, fast, no locks)" -ForegroundColor White
    Write-Host "  • Backup:     /app/data/scim.db (Azure Files, persistent)" -ForegroundColor White
    Write-Host "  • Strategy:   Local writes + periodic backup every 5 minutes" -ForegroundColor White
    Write-Host ""
    Write-Host "Benefits:" -ForegroundColor Cyan
    Write-Host "  ✓ Fast local writes (no network latency)" -ForegroundColor Green
    Write-Host "  ✓ No file locking issues" -ForegroundColor Green
    Write-Host "  ✓ Persistence via periodic backups" -ForegroundColor Green
    Write-Host "  ✓ Auto-restore on container restart" -ForegroundColor Green
    Write-Host "  ⚠ Maximum data loss: 5 minutes" -ForegroundColor Yellow
} else {
    Write-Host "✗ Failed to update container app" -ForegroundColor Red
    exit 1
}
