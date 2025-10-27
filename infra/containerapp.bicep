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
@description('JWT signing secret used to issue OAuth tokens')
@secure()
param jwtSecret string
@description('OAuth client secret required when requesting SCIMTool tokens')
@secure()
param oauthClientSecret string
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
@description('Blob backup storage account name')
param blobBackupAccountName string
@description('Blob backup container name')
param blobBackupContainerName string = 'scimtool-backups'

resource env 'Microsoft.App/managedEnvironments@2024-03-01' existing = {
  name: environmentName
}

// (Azure Files mount removed in blob backup mode)

resource app 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  properties: {
    environmentId: env.id
    // workloadProfileName omitted - uses default consumption model
    configuration: {
      ingress: {
        external: true
        targetPort: targetPort
        transport: 'auto'
      }
      // Only configure registry authentication for private registries (not ghcr.io which is public)
      registries: acrLoginServer != 'ghcr.io' ? [
        {
          server: acrLoginServer
          identity: 'system'
        }
      ] : []
      secrets: [
        {
          name: 'scim-shared-secret'
          value: scimSharedSecret
        }
        {
          name: 'jwt-secret'
          value: jwtSecret
        }
        {
          name: 'oauth-client-secret'
          value: oauthClientSecret
        }
      ]
    }
    template: {
      // Init container only cleans Azure Files journal artifacts now; main container handles restore to /tmp
      initContainers: []
      containers: [
        {
          name: 'scimtool'
          image: '${acrLoginServer}/${image}'
          env: [
            { name: 'SCIM_SHARED_SECRET', secretRef: 'scim-shared-secret' }
            { name: 'JWT_SECRET', secretRef: 'jwt-secret' }
            { name: 'OAUTH_CLIENT_SECRET', secretRef: 'oauth-client-secret' }
            { name: 'NODE_ENV', value: 'production' }
            { name: 'PORT', value: string(targetPort) }
            { name: 'DATABASE_URL', value: 'file:/tmp/local-data/scim.db' }
            { name: 'BLOB_BACKUP_ACCOUNT', value: blobBackupAccountName }
            { name: 'BLOB_BACKUP_CONTAINER', value: blobBackupContainerName }
            // Metadata for in-app "Copy Update Command" (avoids discovery in update script)
            { name: 'SCIM_RG', value: resourceGroup().name }
            { name: 'SCIM_APP', value: appName }
            { name: 'SCIM_REGISTRY', value: acrLoginServer }
            { name: 'SCIM_CURRENT_IMAGE', value: '${acrLoginServer}/${image}' }
          ]
          resources: {
            cpu: json(cpuCores)
            memory: memory
          }
          volumeMounts: []
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
      }
      volumes: []
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
