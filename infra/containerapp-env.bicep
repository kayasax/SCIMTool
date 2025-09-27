// Container Apps Environment for SCIMTool

param location string = resourceGroup().location
@description('Name of the Container Apps Environment')
param caeName string
@description('Log Analytics workspace name (created if not existing)')
param lawName string
// (Removed daprInstrumentationEnabled until needed)

resource law 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: lawName
  location: location
  properties: {
    retentionInDays: 30
    features: {
      searchVersion: 2
    }
  }
}

resource env 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: caeName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: law.properties.customerId
  // Obtain shared key via resource function for dependency clarity
  sharedKey: law.listKeys().primarySharedKey
      }
    }
  // Dapr instrumentation key intentionally omitted
  }
  tags: {
    project: 'scimtool'
  }
}

output environmentId string = env.id
output logAnalyticsId string = law.id
