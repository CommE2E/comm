// @flow

import type { $Request } from 'express';

import { getAppURLFactsFromRequestURL } from './urls';

function assertSecureRequest(req: $Request) {
  const { https } = getAppURLFactsFromRequestURL(req.originalUrl);
  if (https && req.get('X-Forwarded-SSL') !== 'on') {
    throw new Error('insecure request');
  }
}

export { assertSecureRequest };
