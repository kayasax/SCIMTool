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

@description('Resource ID of the subnet that will host the private endpoint for blob access')
param privateEndpointSubnetId string

@description('Private DNS zone name used for blob private endpoints (must exist in the resource group)')
param privateDnsZoneName string = format('privatelink.blob.{0}', environment().suffixes.storage)

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
      defaultAction: 'Deny'
      bypass: 'AzureServices'
    }
    publicNetworkAccess: 'Disabled'
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

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  name: 'default'
  parent: account
}

resource container 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: containerName
  parent: blobService
  properties: {
    publicAccess: 'None'
  }
}

resource privateDnsZone 'Microsoft.Network/privateDnsZones@2020-06-01' existing = {
  name: privateDnsZoneName
}

resource privateEndpoint 'Microsoft.Network/privateEndpoints@2023-09-01' = {
  name: '${storageAccountName}-blob-pe'
  location: location
  properties: {
    subnet: {
      id: privateEndpointSubnetId
    }
    privateLinkServiceConnections: [
      {
        name: 'blob-connection'
        properties: {
          privateLinkServiceId: account.id
          groupIds: [
            'blob'
          ]
        }
      }
    ]
  }
  tags: {
    project: 'scimtool'
    component: 'blob-pe'
  }
}

resource privateDnsZoneGroup 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2020-11-01' = {
  name: 'blob-zone'
  parent: privateEndpoint
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'blob-zone-config'
        properties: {
          privateDnsZoneId: privateDnsZone.id
        }
      }
    ]
  }
}

output storageAccountName string = account.name
output containerName string = containerName
output storageAccountId string = account.id
