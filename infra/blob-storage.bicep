@description('Location for storage account')
param location string = resourceGroup().location
@description('Globally unique storage account name (lowercase, 3-24 chars)')
param storageAccountName string
@description('Blob container name for SQLite snapshots')
param containerName string = 'scimtool-backups'
@description('Redundancy SKU')
@allowed([
  'Standard_LRS'
  'Standard_GRS'
  'Standard_RAGRS'
  'Standard_ZRS'
])
param sku string = 'Standard_LRS'

resource account 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: { name: sku }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
    encryption: {
      services: {
        file: { enabled: true }
        blob: { enabled: true }
      }
      keySource: 'Microsoft.Storage'
    }
    allowSharedKeyAccess: true // retained for general ops, not required for blob with MSI but harmless
  }
  tags: {
    project: 'scimtool'
    component: 'blob-backup'
  }
}

resource container 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${storageAccountName}/default/${containerName}'
  properties: {
    publicAccess: 'None'
  }
}

output storageAccountName string = account.name
output containerName string = containerName
output storageAccountId string = account.id
