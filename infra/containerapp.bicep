// Deploy SCIMTool Container App referencing existing environment & ACR

@description('Location for deployment')
param location string = resourceGroup().location
@description('Container App name')
param appName string
@description('Managed Environment name (should exist or be deployed via containerapp-env.bicep)')
param environmentName string
@description('ACR login server (e.g. myacr.azurecr.io)')
param acrLoginServer string
@description('Image tag to deploy (e.g. scimtool/api:latest)')
param image string
@description('SCIM shared secret')
@secure()
param scimSharedSecret string
@description('Target port inside container')
param targetPort int = 80
@description('Min replicas')
param minReplicas int = 1
@description('Max replicas')
param maxReplicas int = 2
@description('CPU cores per replica (allowed: 0.25,0.5,1,2). Use 1 for reliability if unsure.')
@allowed([
  '0.25'
  '0.5'
  '1'
  '2'
])
param cpuCores string = '0.5'
@description('Optional memory per replica')
param memory string = '1Gi'

resource env 'Microsoft.App/managedEnvironments@2024-03-01' existing = {
  name: environmentName
}

resource app 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  properties: {
    environmentId: env.id
    configuration: {
      ingress: {
        external: true
        targetPort: targetPort
        transport: 'auto'
      }
      registries: [
        {
          server: acrLoginServer
          identity: 'system'
        }
      ]
      secrets: [
        {
          name: 'scim-shared-secret'
          value: scimSharedSecret
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'scimtool'
          image: '${acrLoginServer}/${image}'
          env: [
          { name: 'SCIM_SHARED_SECRET', secretRef: 'scim-shared-secret' }
          { name: 'NODE_ENV', value: 'production' }
          { name: 'PORT', value: string(targetPort) }
          ]
          resources: {
            // Map allowed cpuCores string to numeric
            cpu: json(cpuCores)
            memory: memory
          }
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
      }
    }
  }
  identity: {
    type: 'SystemAssigned'
  }
  tags: {
    project: 'scimtool'
  }
}

output containerAppFqdn string = app.properties.configuration.ingress.fqdn
