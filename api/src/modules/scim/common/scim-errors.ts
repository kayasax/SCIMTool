import { HttpException } from '@nestjs/common';

import { SCIM_ERROR_SCHEMA } from './scim-constants';

export interface ScimErrorOptions {
  status: number;
  detail: string;
  scimType?: string;
}

export function createScimError({ status, detail, scimType }: ScimErrorOptions): HttpException {
  return new HttpException(
    {
      schemas: [SCIM_ERROR_SCHEMA],
      detail,
      scimType,
      status
    },
    status
  );
}
