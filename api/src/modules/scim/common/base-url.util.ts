import type { Request } from 'express';

export function buildBaseUrl(request: Request): string {
  const protocol = request.headers['x-forwarded-proto']?.toString() ?? request.protocol;
  const host = request.headers['x-forwarded-host']?.toString() ?? request.get('host');
  const baseUrl = request.baseUrl ?? '';

  return `${protocol}://${host}${baseUrl}`;
}
