import { Injectable } from '@nestjs/common';

@Injectable()
export class ScimMetadataService {
  buildLocation(baseUrl: string, resourceType: string, id: string): string {
    const trimmedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${trimmedBaseUrl}/${resourceType}/${id}`;
  }

  currentIsoTimestamp(): string {
    return new Date().toISOString();
  }
}
