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
@description('Storage account name for persistent data (optional)')
param storageAccountName string = ''
@description('Storage account key for file share access (optional)')
@secure()
param storageAccountKey string = ''
@description('File share name for persistent data (optional)')
param fileShareName string = 'scimtool-data'

resource env 'Microsoft.App/managedEnvironments@2024-03-01' existing = {
  name: environmentName
}

// Conditionally create storage definition if storage account is provided
resource storage 'Microsoft.App/managedEnvironments/storages@2024-03-01' = if (!empty(storageAccountName)) {
  name: 'scimtool-storage'
  parent: env
  properties: {
    azureFile: {
      accountName: storageAccountName
      accountKey: storageAccountKey
      shareName: fileShareName
      accessMode: 'ReadWrite'
    }
  }
}

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
      ]
    }
    template: {
      // Init container to clean up stale SQLite journal files (Azure Files + SQLite locking issue)
      initContainers: !empty(storageAccountName) ? [
        {
          name: 'restore-and-cleanup'
          image: 'busybox:latest'
          command: [
            'sh'
            '-c'
            'mkdir -p /app/local-data && echo "Local data directory created" && if [ -f /app/data/scim.db ]; then echo "Restoring database from Azure Files backup..." && cp /app/data/scim.db /app/local-data/scim.db && echo "Database restored"; else echo "No backup found, starting fresh"; fi && echo "Cleaning up Azure Files lock files..." && rm -f /app/data/*.db-journal /app/data/*.db-shm /app/data/*.db-wal && echo "Init complete"'
          ]
          volumeMounts: [
            {
              volumeName: 'data-volume'
              mountPath: '/app/data'
            }
          ]
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
        }
      ] : []
      containers: [
        {
          name: 'scimtool'
          image: '${acrLoginServer}/${image}'
          env: [
          { name: 'SCIM_SHARED_SECRET', secretRef: 'scim-shared-secret' }
          { name: 'NODE_ENV', value: 'production' }
          { name: 'PORT', value: string(targetPort) }
          // ALWAYS use local storage for fast database access (backup service handles Azure Files)
          { name: 'DATABASE_URL', value: 'file:/app/local-data/scim.db' }
          ]
          resources: {
            // Map allowed cpuCores string to numeric
            cpu: json(cpuCores)
            memory: memory
          }
          volumeMounts: !empty(storageAccountName) ? [
            {
              volumeName: 'data-volume'
              mountPath: '/app/data'
            }
          ] : []
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
      }
      volumes: !empty(storageAccountName) ? [
        {
          name: 'data-volume'
          storageType: 'AzureFile'
          storageName: 'scimtool-storage'
        }
      ] : []
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
