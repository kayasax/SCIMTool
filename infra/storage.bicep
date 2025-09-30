// Azure Storage Account + File Share for SCIMTool persistent database storage
// Uses classic Microsoft.Storage provider for SMB file share

@description('Location for the storage account')
param location string = resourceGroup().location

@description('Storage account name (must be globally unique, 3-24 lowercase alphanumeric)')
param storageAccountName string

@description('File share name for SQLite database')
param fileShareName string = 'scimtool-data'

@description('File share quota in GiB')
@minValue(5)
@maxValue(5120)
param shareQuotaGiB int = 5

@description('Storage account SKU')
@allowed([
  'Standard_LRS'
  'Standard_ZRS'
  'Standard_GRS'
  'Standard_RAGRS'
])
param storageSku string = 'Standard_LRS'

// Storage Account
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  kind: 'StorageV2'
  sku: {
    name: storageSku
  }
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: true
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
  tags: {
    project: 'scimtool'
    component: 'storage'
  }
}

// File Service
resource fileService 'Microsoft.Storage/storageAccounts/fileServices@2023-01-01' = {
  name: 'default'
  parent: storageAccount
  properties: {
    shareDeleteRetentionPolicy: {
      enabled: true
      days: 7
    }
  }
}

// File Share for SQLite database
resource fileShare 'Microsoft.Storage/storageAccounts/fileServices/shares@2023-01-01' = {
  name: fileShareName
  parent: fileService
  properties: {
    accessTier: 'TransactionOptimized'
    shareQuota: shareQuotaGiB
    enabledProtocols: 'SMB'
  }
}

// Outputs
output storageAccountName string = storageAccount.name
output storageAccountId string = storageAccount.id
output fileShareName string = fileShare.name
@secure()
output storageAccountKey string = storageAccount.listKeys().keys[0].value
