// Azure Container Registry (ACR) for SCIMTool images
// Provides a private registry to host and version SCIMTool containers
// Parameters allow reuse across environments.

param location string = resourceGroup().location
@description('Name for the Azure Container Registry (3-50 alphanumeric). Will be lowercased.')
param acrName string
@description('Sku tier for ACR: Basic, Standard, or Premium')
@allowed([ 'Basic' 'Standard' 'Premium' ])
param sku string = 'Basic'
@description('Enable admin user (not recommended for production). For CI use tokens or managed identity.')
param enableAdminUser bool = false
@description('Optional IP ACLs (Premium only). Leave empty for none.')
param publicNetworkAllow list = []

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: toLower(acrName)
  location: location
  sku: { name: sku }
  properties: {
    adminUserEnabled: enableAdminUser
    networkRuleSet: empty(publicNetworkAllow) ? null : {
      defaultAction: 'Allow'
      ipRules: [for ip in publicNetworkAllow: { action: 'Allow' value: ip }]
    }
    policies: {
      retentionPolicy: {
        days: 30
        status: 'Enabled'
      }
      quarantinePolicy: {
        status: 'Disabled'
      }
      trustPolicy: {
        status: 'Disabled'
        type: 'Notary'
      }
      exportPolicy: {
        status: 'Disabled'
      }
    }
  }
}

output loginServer string = registry.properties.loginServer
output acrId string = registry.id
