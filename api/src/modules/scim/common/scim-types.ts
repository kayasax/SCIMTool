export interface ScimMeta {
  resourceType: string;
  created: string;
  lastModified: string;
  location: string;
  version?: string;
}

export interface ScimUserResource {
  schemas: [string, ...string[]];
  id: string;
  userName: string;
  externalId?: string;
  active?: boolean;
  name?: {
    givenName?: string;
    familyName?: string;
    [key: string]: unknown;
  };
  emails?: Array<{
    value: string;
    type?: string;
    primary?: boolean;
  }>;
  groups?: Array<{
    value: string;
    display?: string;
    type?: string;
  }>;
  meta: ScimMeta;
  [key: string]: unknown;
}

export interface ScimGroupResource {
  schemas: [string, ...string[]];
  id: string;
  displayName: string;
  members?: Array<{
    value: string;
    display?: string;
    type?: string;
  }>;
  meta: ScimMeta;
  [key: string]: unknown;
}

export interface ScimListResponse<T> {
  schemas: [string];
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  Resources: T[];
}
